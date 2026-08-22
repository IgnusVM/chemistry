#!/usr/bin/env bash
#
# Chemistry database backup → S3-compatible object storage.
#
#   chemistry-backup.sh            take a backup
#   chemistry-backup.sh --verify   report on the newest backup, exit 1 if stale
#
# Design notes worth keeping in mind if you change this:
#
#   * The dump is written to a temp file and CHECKED before upload, rather than
#     streamed straight through a pipe. A streamed pipe happily uploads a
#     truncated dump if pg_dump dies halfway, and you don't find out until the
#     restore you're depending on. The database is small; the safety is free.
#   * Nothing here deletes anything. Retention is a bucket lifecycle rule, so
#     the credential this script uses never needs DeleteObject.
#   * All account-specific values come from the config file. Handover is
#     replacing that file, not editing this script.

set -euo pipefail

CONFIG="${CHEMISTRY_BACKUP_CONFIG:-/etc/chemistry-backup.env}"

if [[ ! -r "$CONFIG" ]]; then
  echo "FATAL: cannot read config at $CONFIG" >&2
  echo "Copy chemistry-backup.env.example there and fill it in (chmod 600)." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$CONFIG"; set +a

: "${BACKUP_S3_BUCKET:?not set in $CONFIG}"
: "${BACKUP_S3_PREFIX:=chemistry-backups}"
: "${PG_CONTAINER:=chemistry-postgres-1}"
: "${PG_USER:=chemistry}"
: "${PG_DB:=chemistry}"
: "${STALE_AFTER_HOURS:=36}"

# Only set when using a non-AWS S3-compatible endpoint.
AWS_ARGS=()
[[ -n "${BACKUP_S3_ENDPOINT:-}" ]] && AWS_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")

S3_BASE="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
die() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FATAL: $*" >&2; exit 1; }

# ---------------------------------------------------------------- verify mode
if [[ "${1:-}" == "--verify" ]]; then
  # Needs s3:ListBucket. Say so plainly rather than reporting "no backups",
  # which would be an alarming and wrong conclusion to draw from a permissions
  # error on a system whose backups are fine.
  if ! newest=$(aws "${AWS_ARGS[@]}" s3 ls "${S3_BASE}/" --recursive 2>&1 | sort | tail -1); then
    die "could not list ${S3_BASE}/ — this check needs s3:ListBucket"
  fi
  if grep -qi "AccessDenied\|ERROR" <<<"$newest"; then
    die "could not list ${S3_BASE}/ — this check needs s3:ListBucket"
  fi
  [[ -z "$newest" ]] && die "no backups found under ${S3_BASE}/"

  stamp=$(awk '{print $1" "$2}' <<<"$newest")
  size=$(awk '{print $3}' <<<"$newest")
  key=$(awk '{print $4}' <<<"$newest")
  age_h=$(( ( $(date -u +%s) - $(date -u -d "$stamp" +%s) ) / 3600 ))

  log "newest: $key"
  log "  taken ${age_h}h ago, ${size} bytes"

  (( size < 1000 )) && die "newest backup is implausibly small (${size} bytes)"
  if (( age_h > STALE_AFTER_HOURS )); then
    die "newest backup is ${age_h}h old (threshold ${STALE_AFTER_HOURS}h)"
  fi
  log "OK"
  exit 0
fi

# ---------------------------------------------------------------- backup mode
command -v aws >/dev/null || die "aws cli not installed"
docker inspect "$PG_CONTAINER" >/dev/null 2>&1 || die "container $PG_CONTAINER not running"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
# Partitioned by date so a lifecycle rule and a human both find things easily.
KEY="${BACKUP_S3_PREFIX}/$(date -u +%Y/%m)/chemistry-${STAMP}.sql.gz"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
DUMP="$TMP/chemistry.sql.gz"

log "dumping ${PG_DB} from ${PG_CONTAINER}"
# Plain SQL rather than -Fc: it restores with nothing but psql, survives
# Postgres major-version drift better, and can be read by a human under
# pressure. The database is small enough that format efficiency is irrelevant.
if ! docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" --clean --if-exists \
     | gzip -9 > "$DUMP"; then
  die "pg_dump failed — nothing uploaded"
fi

# --- verify before it counts as a backup ---
bytes=$(stat -c%s "$DUMP")
log "dump is ${bytes} bytes"
(( bytes < 1000 )) && die "dump is implausibly small (${bytes} bytes) — not uploading"
gzip -t "$DUMP" || die "dump failed gzip integrity check — not uploading"
# A dump that doesn't end cleanly means pg_dump was interrupted.
zcat "$DUMP" | tail -5 | grep -q "PostgreSQL database dump complete" \
  || die "dump is missing its completion marker — not uploading"
# Sanity-check that real data is in there, not just an empty schema.
tables=$(zcat "$DUMP" | grep -c "^CREATE TABLE" || true)
(( tables < 5 )) && die "only ${tables} tables in dump — refusing to upload"
log "verified: ${tables} tables, archive intact"

log "uploading to s3://${BACKUP_S3_BUCKET}/${KEY}"
aws "${AWS_ARGS[@]}" s3 cp "$DUMP" "s3://${BACKUP_S3_BUCKET}/${KEY}" \
  --only-show-errors || die "upload failed"

# Confirm it landed at the right size, rather than trusting the exit code alone.
# head-object rather than `s3 ls` on purpose: listing needs s3:ListBucket, and
# the whole point of the recommended backup identity is that it holds PutObject
# and little else. Where even this is denied, warn rather than fail — the upload
# itself already succeeded or `aws s3 cp` would have returned non-zero.
if remote=$(aws "${AWS_ARGS[@]}" s3api head-object \
              --bucket "$BACKUP_S3_BUCKET" --key "$KEY" \
              --query ContentLength --output text 2>/dev/null); then
  if [[ "$remote" != "$bytes" ]]; then
    die "uploaded object is ${remote} bytes but the dump was ${bytes}"
  fi
  log "confirmed ${remote} bytes in the bucket"
else
  log "NOTE: could not read the object back (credential lacks GetObject) — upload itself succeeded"
fi

log "backup complete: ${KEY}"

if [[ -n "${HEALTHCHECK_URL:-}" ]]; then
  curl -fsS -m 10 "$HEALTHCHECK_URL" >/dev/null 2>&1 \
    && log "pinged healthcheck" \
    || log "WARNING: healthcheck ping failed (backup itself succeeded)"
fi
