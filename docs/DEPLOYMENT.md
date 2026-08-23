# Deploying Chemistry

Complete setup instructions for standing up Chemistry on infrastructure you
control, starting from a clone of this repository and ending with a working,
backed-up, TLS-secured installation.

No step here depends on any pre-existing account, server, bucket, or credential.
Everything is created from scratch. Placeholder values look like
`cmms.example.org` or `<BUCKET>` — substitute your own throughout.

**Estimated time:** 60–90 minutes, most of it waiting on DNS and image builds.

---

## Contents

1. [What you are deploying](#1-what-you-are-deploying)
2. [What you need before starting](#2-what-you-need-before-starting)
3. [Provision the server](#3-provision-the-server)
4. [Install Docker](#4-install-docker)
5. [Set up object storage](#5-set-up-object-storage)
6. [Set up transactional email](#6-set-up-transactional-email)
7. [Point DNS at the server](#7-point-dns-at-the-server)
8. [Get the code onto the server](#8-get-the-code-onto-the-server)
9. [Write the environment file](#9-write-the-environment-file)
10. [First start](#10-first-start)
11. [Reverse proxy and TLS](#11-reverse-proxy-and-tls)
12. [First sign-in](#12-first-sign-in)
13. [Backups](#13-backups)
14. [Routine operations](#14-routine-operations)
15. [Disaster recovery](#15-disaster-recovery)
16. [Security checklist](#16-security-checklist)
17. [Troubleshooting](#17-troubleshooting)
18. [Environment variable reference](#18-environment-variable-reference)

---

## 1. What you are deploying

A single virtual machine runs everything except storage and email:

```
                    Internet
                       │  :443 (TLS)
                       ▼
              ┌─────────────────┐
              │  nginx (host)   │  TLS termination, reverse proxy
              └────────┬────────┘
                       │  127.0.0.1:3001
              ┌────────▼────────┐
              │   app container │  Next.js, port 3000 internally
              └────────┬────────┘
                       │  postgres:5432 (docker network)
              ┌────────▼────────┐
              │ postgres        │  named volume: chemistry-data
              │ container       │
              └─────────────────┘

     External:  object storage (attachments)   email provider (sign-in links)
```

Two containers, managed by Docker Compose. The database lives in a Docker named
volume on the VM. Attachments, asset-type documents, and user avatars live in
object storage and are *never* stored on the VM. Sign-in is by emailed magic
link, so a working outbound email path is a hard requirement rather than a
nicety — without it nobody can log in.

**Sizing.** The application is small; the database for a fleet of a few thousand
assets is measured in tens of megabytes. The binding constraint is not runtime
but the *build*: `npm ci` plus a Next.js production build inside the container is
memory-hungry. Provision **4 GB RAM**, or 2 GB with at least 2 GB of swap
configured. 2 vCPU and 40 GB disk is ample. A build on a 1 GB instance will fail
with an out-of-memory kill partway through, which is a confusing way to discover
this.

---

## 2. What you need before starting

Five things, all of which the following sections create from nothing:

| # | What | Used for | Cost |
|---|------|----------|------|
| 1 | A Linux VM with a public IPv4 address | Runs everything | Varies; a small instance suffices |
| 2 | A domain name you control DNS for | The URL, and email sender verification | Varies |
| 3 | An S3-compatible object storage bucket | Attachments, documents, avatars, backups | Pennies per month at this scale |
| 4 | A transactional email account | Magic-link sign-in | Free tier is typically sufficient |
| 5 | Access to this Git repository | Source code | — |

The reference instructions below use **Ubuntu 24.04 LTS**, **nginx**, **AWS S3**,
and **Resend**. Substitutions are supported and noted where they matter — the
application talks to any S3-compatible storage, and the email path is a single
module if you need to replace the provider.

---

## 3. Provision the server

Create an Ubuntu 24.04 LTS instance with a public IPv4 address at any provider.
Add your SSH public key during creation rather than using a root password.

Connect and bring it up to date:

```bash
ssh root@<SERVER_IP>
apt update && apt upgrade -y
```

### Create an administrative user

Working as `root` over SSH is unnecessary risk. Create a normal user with sudo:

```bash
adduser --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
```

Confirm you can log in as `deploy` **in a second terminal, before closing this
one** — locking yourself out of a fresh server is an avoidable afternoon:

```bash
ssh deploy@<SERVER_IP>
sudo -v          # should succeed
```

### Harden SSH

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

> **Docker bypasses UFW.** Docker writes its own iptables rules, and a container
> published to `0.0.0.0` is reachable from the internet *even though UFW says the
> port is closed*. This is why `docker-compose.prod.yml` publishes the app on
> `127.0.0.1:3001` rather than `3001`. Do not change that binding. nginx reaches
> it over loopback; nothing else needs to.

### Swap (skip if you provisioned 4 GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Install Docker

Use Docker's own repository. The version in Ubuntu's default repositories is
usually too old and ships without the Compose v2 plugin.

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
     -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                    docker-buildx-plugin docker-compose-plugin
```

Let `deploy` use Docker without sudo, then verify:

```bash
sudo usermod -aG docker deploy
newgrp docker                 # or log out and back in
docker run --rm hello-world
docker compose version        # must report v2.x
```

---

## 5. Set up object storage

Chemistry stores every uploaded file — work order photos, asset-type documents,
user avatars — in object storage rather than on the VM. This keeps the server
stateless apart from its database, and means losing the VM loses no attachments.

Instructions below are for AWS S3. For Backblaze B2, Cloudflare R2, or a
self-hosted MinIO, the concepts map one-to-one; set `BACKUP_S3_ENDPOINT` (and
point the AWS SDK at the same endpoint) instead of using AWS defaults.

### 5.1 Create the bucket

In the S3 console, **Create bucket**:

- **Name:** anything globally unique, e.g. `example-cmms`
- **Region:** whichever is nearest your users — note it, it becomes `AWS_REGION`
- **Block all public access:** **ON.** Leave it on.
- **Bucket Versioning:** **Enable.**

> **Why versioning matters.** It is the single cheapest durability improvement
> available here. With it enabled, an overwritten or deleted object leaves a
> recoverable previous version behind. Without it, a mistaken delete of an
> attachment or a backup is simply gone. Enable it before you put anything in the
> bucket.

**Public access stays blocked.** The application never serves files from a public
URL; it generates short-lived presigned links (one hour) when a user views an
attachment. A public bucket would expose every photograph and document to anyone
who guessed a key.

**CORS configuration is not required.** Uploads are posted to the application and
forwarded to storage server-side, and downloads are ordinary browser navigations
to presigned URLs. Neither is a cross-origin XHR, so no CORS rules are needed.

### 5.2 Create the application's storage identity

Create an IAM user — **not** an account root key — with programmatic access and
no console access. Attach this inline policy, substituting your bucket name and,
if you changed `S3_PREFIX`, your prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::<BUCKET>/chemistry/*"
    }
  ]
}
```

That is the complete set of permissions the application needs. It deliberately
grants no `ListBucket`: the app addresses every object by a key it already holds
in the database, so listing is unnecessary, and withholding it means a
compromised application key cannot enumerate what exists.

Note that this policy is scoped to the `chemistry/` prefix. The application
cannot read or write anything else in the bucket, which is what makes it safe to
share a bucket with unrelated data if you choose to.

Save the **access key ID** and **secret access key**. The secret is displayed
exactly once.

### 5.3 Create the backup identity

Create a **second, separate** IAM user for backups. Do not reuse the application
key — the entire point is that these two identities have different powers.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WriteBackups",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::<BUCKET>/chemistry-backups/*"
    },
    {
      "Sid": "ListBackupsForVerification",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::<BUCKET>",
      "Condition": { "StringLike": { "s3:prefix": "chemistry-backups/*" } }
    }
  ]
}
```

There is deliberately **no `s3:DeleteObject`** in that policy. A backup identity
that can delete backups is a backup identity that can be used to destroy them —
by an attacker, or by a bug. Retention is handled by a bucket lifecycle rule
instead, which runs on the storage provider's side and is not reachable from the
server at all.

`GetObject` is included so that restores and integrity verification can run with
this same credential. If you prefer a strictly write-only backup identity, remove
it and run restores with an administrative credential instead.

Save this second pair of keys separately from the first.

### 5.4 Lifecycle rules

Under the bucket's **Management → Lifecycle rules**, create two:

| Rule | Scope | Action |
|------|-------|--------|
| `expire-backups` | Prefix `chemistry-backups/` | Expire current versions after **90 days** |
| `expire-old-versions` | Whole bucket | Permanently delete **noncurrent** versions after **30 days** |

The first is your backup retention policy. The second keeps versioning from
accumulating cost without bound — without it, every overwritten object is
retained and billed forever.

Neither the application nor the backup identity can read lifecycle configuration,
by design. If backups ever stop expiring, check the console rather than debugging
the scripts.

---

## 6. Set up transactional email

Sign-in is by magic link. **If email does not work, nobody can log in** — there
is no password fallback. Configure and test this before going further.

The application uses an HTTP email API rather than SMTP, deliberately: most cloud
providers block outbound SMTP ports on new accounts by default, whereas an HTTPS
API needs only port 443, which is already open.

### 6.1 Create an account and verify your sending domain

1. Create an account at your transactional email provider (Resend by default).
2. Add the domain you will send from — typically the same registrable domain as
   the application, e.g. `example.org`.
3. The provider issues DNS records to prove ownership and authorize sending —
   typically a `TXT` record for domain verification, `CNAME` or `TXT` records for
   DKIM signing, and an `MX` or `TXT` record for the return path.
4. Add each of those records at your DNS host exactly as given.
5. Wait for the provider's dashboard to show the domain as **verified**.
   Propagation is usually minutes but can take longer.

Do not skip domain verification. Unverified senders are silently spam-filtered,
which presents as "sign-in links never arrive" with nothing in any log to explain
it.

### 6.2 Create an API key

Create an API key with send-only permission. Save it — this becomes
`RESEND_API_KEY`.

Choose a `EMAIL_FROM` address on the verified domain, formatted as
`Chemistry <no-reply@example.org>`. The mailbox does not need to exist; nothing
replies to it.

### 6.3 Using a different provider

Email is isolated in `src/lib/mailer.ts`. Swapping providers means changing that
one module's HTTP call, leaving the rest of the sign-in flow untouched.

---

## 7. Point DNS at the server

At your DNS host, create an `A` record for the hostname the application will
serve from:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| `A` | `cmms` | `<SERVER_IP>` | **DNS only** |

If your DNS provider offers a CDN/proxy toggle, leave it **off** for the initial
setup — certificate issuance in section 11 validates over plain HTTP and a proxy
in front of it complicates that. You can enable proxying afterwards.

Confirm resolution before continuing, from your workstation:

```bash
dig +short cmms.example.org      # must print <SERVER_IP>
```

TLS issuance will fail if this does not resolve yet, so wait for it.

---

## 8. Get the code onto the server

### 8.1 Give the server read access to the repository

If the repository is public, skip to 8.2 — no credentials are needed.

For a private repository, generate a **deploy key** on the server. A deploy key
grants access to one repository only, which is what you want; a personal access
token grants access to everything that account can reach.

```bash
ssh-keygen -t ed25519 -C "cmms-deploy" -f ~/.ssh/chemistry_deploy_key -N ""
cat ~/.ssh/chemistry_deploy_key.pub
```

Add the printed public key to the repository under **Settings → Deploy keys**,
leaving "Allow write access" **unchecked** — the server only ever pulls.

Tell SSH to use it for this host:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/chemistry_deploy_key
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com          # expect a "successfully authenticated" message
```

### 8.2 Clone

```bash
sudo mkdir -p /opt/chemistry
sudo chown deploy:deploy /opt/chemistry
git clone <REPOSITORY_URL> /opt/chemistry
cd /opt/chemistry
```

`/opt/chemistry` is a convention, not a requirement. If you use a different path,
adjust it consistently in the cron jobs and the backup configuration later.

---

## 9. Write the environment file

Every secret and every environment-specific value lives in one file that is never
committed to source control.

```bash
cd /opt/chemistry
cp .env.example .env
chmod 600 .env
```

Generate two independent random secrets:

```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')"
```

Edit `.env` to look like this, with your own values:

```bash
# --- Database ---------------------------------------------------------
# Must match what the compose file passes to Postgres. The app builds its
# own DATABASE_URL from this; you do not set DATABASE_URL here.
POSTGRES_PASSWORD=<generated above>

# --- Application ------------------------------------------------------
# Signs session cookies. Rotating this signs everyone out, which is the
# correct thing to do on a change of ownership.
SESSION_SECRET=<generated above>

# Public origin, with scheme and no trailing slash. Magic-link emails are
# built from this, so a wrong value produces links that go nowhere.
APP_BASE_URL=https://cmms.example.org

# --- First administrator ---------------------------------------------
# Granted org-admin on every container start. Sign-up is invite-only, so
# without this nobody can administer a brand-new instance.
BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_NAME=Ops Lead

# --- Email ------------------------------------------------------------
RESEND_API_KEY=<from section 6.2>
EMAIL_FROM=Chemistry <no-reply@example.org>

# --- Object storage ---------------------------------------------------
AWS_REGION=<bucket region>
AWS_ACCESS_KEY_ID=<application key from section 5.2>
AWS_SECRET_ACCESS_KEY=<application secret from section 5.2>
S3_BUCKET=<BUCKET>
S3_PREFIX=chemistry
```

> **Back this file up now**, into a password manager or wherever your
> organization keeps secrets. It exists in exactly one place on one machine.
> Losing it is not fatal — every value in it can be regenerated or reissued — but
> it converts a twenty-minute rebuild into an afternoon of reissuing credentials.

`BOOTSTRAP_ADMIN_EMAIL` is worth understanding: the seed grants org-admin to that
address on every start, creating the user record if it does not exist. It is an
upsert, safe to leave set permanently, and it never demotes anyone. Leaving it
unset is legitimate too — the instance seeds its structure and simply has no
administrator until you set it and restart.

---

## 10. First start

```bash
cd /opt/chemistry
docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes several minutes: it installs dependencies, generates the
database client, and produces a production build of the application. Subsequent
builds reuse cached layers and are much faster.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

On startup the container applies any pending database migrations, then runs two
idempotent seed scripts (reference data, then help articles), then starts the
server. A healthy first start logs migrations being applied, a seed summary
naming your bootstrap admin, and finally a "Ready" line from the server.

Verify locally before involving nginx, which isolates whether a later problem is
the app or the proxy:

```bash
curl -I http://127.0.0.1:3001/
```

Expect `307` redirecting to `/login` — that is correct, it means the app is
running and the session check is working. Then:

```bash
curl -I http://127.0.0.1:3001/login     # expect 200
```

If either fails, stop here and see [Troubleshooting](#17-troubleshooting). Do not
move on to TLS with a broken application.

---

## 11. Reverse proxy and TLS

### 11.1 Install nginx

```bash
sudo apt install -y nginx
```

### 11.2 Configure the site

```bash
sudo tee /etc/nginx/sites-available/chemistry >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name cmms.example.org;

    # Work order photos come straight off phones and the application accepts
    # attachments up to 20 MB. This must exceed that, with room for multipart
    # overhead, or large uploads fail at the proxy with 413 before the
    # application ever sees them.
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for streamed responses and websocket upgrades.
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Uploading a 20 MB photo over a weak signal is slow; the default
        # 60s read timeout cuts those off mid-transfer.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/chemistry /etc/nginx/sites-enabled/chemistry
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Replace `cmms.example.org` with your hostname in the block above before running
it. Visiting `http://cmms.example.org` should now reach the login page over plain
HTTP.

### 11.3 Issue a certificate

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cmms.example.org
```

Choose the redirect-HTTP-to-HTTPS option when prompted. Certbot rewrites the
nginx config in place, adding the TLS listener and the redirect, and installs a
systemd timer that renews automatically.

Confirm renewal is actually armed — a certificate that silently fails to renew
takes the site down in ninety days:

```bash
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

Then confirm the real thing:

```bash
curl -I https://cmms.example.org/login      # expect 200
```

---

## 12. First sign-in

1. Open `https://cmms.example.org` — it redirects to the login page.
2. Enter the address you set as `BOOTSTRAP_ADMIN_EMAIL`.
3. A sign-in link arrives by email. Follow it.
4. You land on the dashboard as an org administrator.

If the email does not arrive within a minute or two, check the provider's
dashboard for a delivery log entry before assuming the application is at fault —
it will show whether the message was accepted, bounced, or never sent.

Once signed in, work through the administration section to make the instance
yours: invite the rest of the team, define divisions and departments, create asset
types and their custom fields, add locations, and set resolution codes. The seed
creates a reasonable starting structure; all of it is editable in place.

---

## 13. Backups

Nothing above protects the database. Object storage holds the attachments and the
repository holds the code, but assets, work orders, notes, and history exist only
in the Postgres volume on this VM. Set up backups now, before there is data worth
losing.

The backup scripts live in `scripts/backup/`. All account-specific configuration
is in a single file outside the repository, so nothing here needs editing.

```bash
cd /opt/chemistry

sudo apt install -y awscli

sudo install -m 755 scripts/backup/chemistry-backup.sh  /usr/local/bin/chemistry-backup
sudo install -m 755 scripts/backup/chemistry-restore.sh /usr/local/bin/chemistry-restore

sudo cp scripts/backup/chemistry-backup.env.example /etc/chemistry-backup.env
sudo chmod 600 /etc/chemistry-backup.env
sudo nano /etc/chemistry-backup.env
```

Fill in the bucket, the region, and the **backup** credentials from section 5.3 —
not the application credentials. Set `BACKUP_S3_PREFIX=chemistry-backups` to match
the IAM policy and lifecycle rule.

Schedule it:

```bash
sudo tee /etc/cron.d/chemistry-backup >/dev/null <<'EOF'
20 3 * * * root /usr/local/bin/chemistry-backup >>/var/log/chemistry-backup.log 2>&1
40 8 * * * root /usr/local/bin/chemistry-backup --verify >>/var/log/chemistry-backup.log 2>&1
EOF
```

The nightly job takes and uploads a backup. The morning job checks that a recent
one exists and exits non-zero if the newest is stale — that second job is what
tells you backups have stopped, rather than discovering it during a recovery.

**Then prove it works.** A backup nobody has restored is a hypothesis:

```bash
sudo /usr/local/bin/chemistry-backup
sudo /usr/local/bin/chemistry-restore --latest --into chemistry_restore_test
```

The restore prints row counts when it finishes. Compare them against the live
database; they should match. The live database is untouched by this — restoring
into a scratch database is the safe default, and overwriting the live one
requires an explicit `--yes`.

Clean up the scratch database afterwards:

```bash
docker exec chemistry-postgres-1 psql -U chemistry -d postgres \
  -c 'DROP DATABASE "chemistry_restore_test";'
```

Repeat this test quarterly, and after any change to the backup setup. See
[BACKUP.md](BACKUP.md) for the full runbook.

---

## 14. Routine operations

### Deploying an update

```bash
cd /opt/chemistry
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations and seeds run automatically on container start; there is no separate
migration step. Expect roughly a minute of downtime while the new container
builds and swaps in.

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f app        # application
docker compose -f docker-compose.prod.yml logs -f postgres   # database
sudo tail -f /var/log/nginx/error.log                        # proxy
sudo tail -f /var/log/chemistry-backup.log                   # backups
```

### Restarting

```bash
docker compose -f docker-compose.prod.yml restart app     # app only
docker compose -f docker-compose.prod.yml up -d           # everything
```

### Changing configuration

Edit `/opt/chemistry/.env`, then recreate the containers so the new values are
picked up. A plain `restart` will **not** apply environment changes:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Database shell

```bash
docker exec -it chemistry-postgres-1 psql -U chemistry -d chemistry
```

### Reclaiming disk

Old images accumulate with each deploy:

```bash
docker system df
docker image prune -f
```

Never `docker system prune --volumes` — that flag deletes named volumes, and the
database is a named volume.

---

## 15. Disaster recovery

If the server is lost entirely, a full rebuild is:

1. Provision a new VM and repeat sections 3 and 4.
2. Clone the repository (section 8).
3. Restore `/opt/chemistry/.env` from your password manager.
4. `docker compose -f docker-compose.prod.yml up -d --build`
5. Reinstall the backup tooling and configuration (section 13).
6. Restore the most recent backup over the empty database:
   ```bash
   sudo /usr/local/bin/chemistry-restore --latest --into chemistry --yes
   docker compose -f docker-compose.prod.yml restart app
   ```
7. Repoint DNS at the new address and reissue the certificate (sections 7 and 11).

Attachments need no action at all — they were never on the server. They live in
object storage and are referenced by key, so a restored database finds them
exactly where it left them.

---

## 16. Security checklist

Confirm each of these before treating the installation as production:

- [ ] SSH password authentication disabled, root login disabled
- [ ] UFW enabled; only 22, 80, and 443 open
- [ ] App container published to `127.0.0.1:3001`, never `0.0.0.0`
- [ ] `SESSION_SECRET` is 32+ random bytes, unique to this deployment
- [ ] `POSTGRES_PASSWORD` is randomly generated, not a memorable string
- [ ] `.env` is `chmod 600` and untracked by Git
- [ ] Object storage bucket blocks all public access
- [ ] Bucket versioning enabled
- [ ] Application and backup storage identities are **separate** IAM users
- [ ] Neither identity is an account root key
- [ ] Backup identity has **no** `DeleteObject` permission
- [ ] Lifecycle rules exist for both backup expiry and noncurrent versions
- [ ] TLS certificate issued and auto-renewal verified with `--dry-run`
- [ ] A test restore has been performed and its row counts checked
- [ ] `.env` contents stored in a password manager
- [ ] Unattended security upgrades enabled:
      `sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades`

---

## 17. Troubleshooting

**The build is killed partway through, or the server becomes unresponsive during
deploy.** Out of memory. Add swap (section 3) or resize the instance. This is by
far the most common first-deploy failure.

**`docker compose` reports a variable is required and refuses to start.** A
required key is missing from `.env`. The compose file uses the `:?` form for
`POSTGRES_PASSWORD`, `SESSION_SECRET`, and `APP_BASE_URL` deliberately: refusing
to start is much better than starting with an insecure default and appearing to
work.

**Sign-in emails never arrive.** Check, in order: the provider dashboard's
delivery log; that the sending domain shows as verified; that `EMAIL_FROM` uses
that verified domain; that `RESEND_API_KEY` is present in `.env` and the container
was recreated after it was added. With no API key configured the application logs
links to the container log instead of sending them — useful in development,
silent in production.

**Sign-in links point at the wrong host.** `APP_BASE_URL` is wrong. It must be the
full public origin including scheme, with no trailing slash.

**`502 Bad Gateway` from nginx.** The app container is not listening. Check
`docker compose -f docker-compose.prod.yml ps` and the app logs; confirm
`curl -I http://127.0.0.1:3001/` works from the server itself.

**`413 Request Entity Too Large` when uploading a photo.** `client_max_body_size`
is missing or too small in the nginx config. It must exceed 20 MB.

**Attachments upload but fail to display.** The storage credentials can write but
not read, or the region is wrong. Confirm the IAM policy grants `GetObject` as
well as `PutObject`, and that `AWS_REGION` matches the bucket's actual region.

**Certbot fails to issue.** DNS is not resolving to this server yet, port 80 is
closed, or a CDN proxy is intercepting the validation request. Verify with
`dig +short cmms.example.org` and `sudo ufw status`.

**`--verify` reports it cannot list.** The backup credential lacks `ListBucket`,
or its prefix condition does not match `BACKUP_S3_PREFIX`. The scripts name the
missing permission explicitly rather than reporting "no backups found", which
would be an alarming and wrong conclusion to draw mid-incident.

**Nobody can administer a fresh instance.** `BOOTSTRAP_ADMIN_EMAIL` was unset at
first start. Set it in `.env` and run
`docker compose -f docker-compose.prod.yml up -d` — the seed runs on every start
and will grant it.

---

## 18. Environment variable reference

Set in `/opt/chemistry/.env`. Required variables have no usable default.

| Variable | Required | Description |
|----------|:--------:|-------------|
| `POSTGRES_PASSWORD` | ✅ | Database password. Consumed by both containers; the app's connection string is built from it. |
| `SESSION_SECRET` | ✅ | Signs session cookies. 32+ random bytes. Rotating it signs all users out. |
| `APP_BASE_URL` | ✅ | Public origin, e.g. `https://cmms.example.org`. Used to build sign-in links. No trailing slash. |
| `BOOTSTRAP_ADMIN_EMAIL` | — | Granted org-admin on every start. Required in practice for a new deployment. |
| `BOOTSTRAP_ADMIN_NAME` | — | Display name for that user on first creation. Defaults to the local part of the address. |
| `RESEND_API_KEY` | — | Email API key. Without it, sign-in links are logged instead of sent — development only. |
| `EMAIL_FROM` | — | Sender, e.g. `Chemistry <no-reply@example.org>`. Must be on a verified domain. |
| `AWS_REGION` | — | Bucket region. |
| `AWS_ACCESS_KEY_ID` | — | Application storage key (section 5.2). |
| `AWS_SECRET_ACCESS_KEY` | — | Application storage secret. |
| `S3_BUCKET` | — | Bucket name. |
| `S3_PREFIX` | — | Key prefix within the bucket. Defaults to `chemistry`. Must match the IAM policy. |

Storage variables are individually optional but collectively required for
uploads: without them, file attachments, asset-type documents, and avatars will
fail. Everything else in the application works.

Backup configuration is separate, in `/etc/chemistry-backup.env` — see
[BACKUP.md](BACKUP.md).
