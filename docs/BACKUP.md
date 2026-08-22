# Backups

What's protected, how to restore it, and how to hand the whole thing to someone
else without leaving a trail of personal credentials behind.

## Current state (2026-08-22)

Running nightly at 03:20 UTC on the app server, with a staleness check at 08:40.
A backup and a full scratch restore have both been tested end to end — the
restore reproduced live row counts exactly (300 assets, 2 work orders, 2 users,
31 audit entries).

**One thing is deliberately unfinished:** the backup currently authenticates with
the *application's* S3 key, because no separate identity exists yet. That means
backups live under `chemistry/backups/` (the only prefix that key can reach) and,
more importantly, that a compromise of the app could reach the backups.

To close that gap — a five-minute job in the AWS console, and the only change
needed is to `/etc/chemistry-backup.env`, no script edits:

1. Create the PutObject-only IAM user described below.
2. Put its keys in `/etc/chemistry-backup.env`.
3. Optionally move `BACKUP_S3_PREFIX` out to a top-level `chemistry-backups/`,
   or a separate bucket entirely.

### A note on permissions and restores

The recommended backup identity holds `PutObject` and `ListBucket` only. That has
consequences worth knowing before an emergency:

- `chemistry-restore --key <key> --into <db>` needs **GetObject**.
- `--latest` and `--list` need **ListBucket**.

If the backup credential is locked down to the point where it cannot read, run
restores with an administrative credential instead. Restoring is a rare,
deliberate act; the nightly writer should stay minimal. Both scripts detect a
missing permission and say which one is missing, rather than reporting something
misleading like "no backups found".

## What's at risk, and what covers it

| Data | Where it lives | Covered by |
|---|---|---|
| Postgres — assets, work orders, notes, code files, loans, audit log, users | Docker volume on the app server | **Nightly dump to object storage** (this document) |
| Attachments, asset-type documents, avatars | S3 bucket, `chemistry/` prefix | Already off-server. **Enable bucket versioning** — that's what protects against deletion. |
| Application code | GitHub | Git |
| `/opt/chemistry/.env` | The server, and nowhere else | **Nothing.** Keep a copy in a password manager. |

That last row is the easy one to forget. Losing it isn't fatal — `SESSION_SECRET`
just signs everyone out, and the Resend and AWS keys can be reissued from their
consoles — but it turns a twenty-minute rebuild into an afternoon.

## How it works

`chemistry-backup.sh` runs nightly from cron:

1. `pg_dump` the database to a temp file as plain gzipped SQL.
2. **Verify before uploading** — non-trivial size, intact gzip, the
   `PostgreSQL database dump complete` marker present, and a plausible table
   count. A dump that fails any check is *not* uploaded, so a bad backup never
   silently replaces the idea that you have one.
3. Upload to `s3://<bucket>/<prefix>/YYYY/MM/chemistry-<timestamp>.sql.gz`.
4. Confirm the object is really there.
5. Optionally ping a healthcheck URL.

Two deliberate choices:

- **Plain SQL, not `pg_dump -Fc`.** It restores with nothing but `psql`, tolerates
  Postgres version drift, and can be read by a human at 3am. The database is
  ~10 MB; format efficiency is irrelevant here.
- **The script never deletes anything.** Retention is a bucket lifecycle rule
  (below), which means the backup credential needs `PutObject` and nothing else.
  Backups that the running system is able to delete are not really backups.

## Setup

### 1. A dedicated write-only identity

Do **not** reuse the application's S3 key. Create a separate IAM user whose
policy allows only `PutObject` on the backup prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/chemistry-backups/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET",
      "Condition": { "StringLike": { "s3:prefix": "chemistry-backups/*" } }
    }
  ]
}
```

`ListBucket` is needed for `--verify` and `--list`. Restores are an occasional,
deliberate act — run them with an admin credential rather than granting this one
`GetObject`.

### 2. Bucket settings

- **Versioning: on.** Protects the attachments too, which is the cheapest single
  improvement available here.
- **Lifecycle rule** on `chemistry-backups/`: expire objects after 90 days, and
  expire noncurrent versions after 30. This is what does retention — not the script.

### 3. Config and cron on the server

```bash
# Config (never in git)
cp scripts/backup/chemistry-backup.env.example /etc/chemistry-backup.env
chmod 600 /etc/chemistry-backup.env
$EDITOR /etc/chemistry-backup.env

# Scripts
install -m 755 scripts/backup/chemistry-backup.sh  /usr/local/bin/chemistry-backup
install -m 755 scripts/backup/chemistry-restore.sh /usr/local/bin/chemistry-restore

# Nightly at 03:20 UTC, plus a staleness check each morning
cat >/etc/cron.d/chemistry-backup <<'CRON'
20 3 * * * root /usr/local/bin/chemistry-backup >>/var/log/chemistry-backup.log 2>&1
40 8 * * * root /usr/local/bin/chemistry-backup --verify >>/var/log/chemistry-backup.log 2>&1
CRON
```

## Restoring

**Test restore** (safe — the live database is untouched):

```bash
chemistry-restore --latest --into chemistry_restore_test
```

It prints row counts at the end. Compare them against production; that's the
whole point of the exercise. Do this quarterly, and after any change to the
backup setup.

**Real restore** onto the live database — destructive, requires `--yes`:

```bash
chemistry-restore --list
chemistry-restore --key chemistry-backups/2026/08/chemistry-20260822T032000Z.sql.gz \
                  --into chemistry --yes
```

Then restart the app so Prisma reconnects cleanly:

```bash
cd /opt/chemistry && docker compose -f docker-compose.prod.yml restart app
```

### Rebuilding from nothing

If the server is gone entirely:

1. New host, Docker installed.
2. `git clone` the repo to `/opt/chemistry`.
3. Recreate `/opt/chemistry/.env` (from your password manager).
4. `docker compose -f docker-compose.prod.yml up -d --build` — migrations run on start.
5. `chemistry-restore --latest --into chemistry --yes`.
6. Point DNS at the new host.

Attachments need no action: they live in S3 and are referenced by key.

## Handover checklist

The system is built so that transferring it means **replacing
`/etc/chemistry-backup.env`** — no code changes. `BACKUP_S3_ENDPOINT` also lets
the new owner move off AWS to Backblaze B2, Cloudflare R2, or self-hosted MinIO
without touching a script.

When handing Chemistry to someone else, every one of these must be reissued in
their name and the old ones revoked:

| Credential | Where it lives | Action on handover |
|---|---|---|
| Backup storage key | `/etc/chemistry-backup.env` | New identity in their account; revoke old |
| App S3 key (`AWS_ACCESS_KEY_ID`) | `/opt/chemistry/.env` | New IAM user in their account; revoke old |
| S3 bucket itself | AWS | Either transfer the account or copy objects to theirs and repoint `S3_BUCKET` |
| `RESEND_API_KEY` | `/opt/chemistry/.env` | Their Resend account; reverify the sending domain |
| `SESSION_SECRET` | `/opt/chemistry/.env` | Regenerate — signs everyone out once, which is correct on a change of ownership |
| `POSTGRES_PASSWORD` | `/opt/chemistry/.env` + compose | Rotate |
| Server SSH access | Hetzner VM | Their keys added, previous keys removed |
| DNS | Cloudflare | `chemistry.*` record moved to their zone or account |
| GitHub repo | `IgnusVM/chemistry` | Transfer ownership, or fork and repoint the deploy key |
| Deploy key | `~/.ssh/chemistry_deploy_key` on the VM | Regenerate against their repo |

Two things to watch, because they're shared rather than Chemistry-specific:

- **The VM is shared with DAN.** A clean handover means moving Chemistry to its
  own host, not handing over a box running someone else's project.
- **The S3 bucket is shared with DAN** (`malevolentgods-dan-assets`, `chemistry/`
  prefix). Same reasoning — the new owner should get their own bucket, with
  objects copied across and the prefix repointed.

Neither blocks anything today. Both are much easier to deal with deliberately at
handover time than to discover midway through one.
