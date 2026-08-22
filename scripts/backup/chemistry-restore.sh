#!/usr/bin/env bash
#
# Restore a Chemistry backup.
#
#   chemistry-restore.sh --list                       show available backups
#   chemistry-restore.sh --latest --into scratch_db   restore newest to a scratch DB
#   chemistry-restore.sh --key <s3-key> --into chemistry --yes   DESTRUCTIVE
#
# Restoring into a scratch database is the safe default and the thing you should
# do on a schedule: a backup nobody has restored is a hypothesis, not a backup.
# Overwriting the live database requires both an explicit --into and --yes.

set -euo pipefail

CONFIG="${CHEMISTRY_BACKUP_CONFIG:-/etc/chemistry-backup.env}"
[[ -r "$CONFIG" ]] || { echo "FATAL: cannot read $CONFIG" >&2; exit 1; }
# shellcheck disable=SC1090
set -a; source "$CONFIG"; set +a

: "${BACKUP_S3_BUCKET:?not set in $CONFIG}"
: "${BACKUP_S3_PREFIX:=chemistry-backups}"
: "${PG_CONTAINER:=chemistry-postgres-1}"
: "${PG_USER:=chemistry}"
: "${PG_DB:=chemistry}"

AWS_ARGS=()
[[ -n "${BACKUP_S3_ENDPOINT:-}" ]] && AWS_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
S3_BASE="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}"

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }
die() { echo "FATAL: $*" >&2; exit 1; }

MODE=""; KEY=""; TARGET=""; CONFIRM="no"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)   MODE=list; shift ;;
    --latest) MODE=latest; shift ;;
    --key)    MODE=key; KEY="${2:?--key needs a value}"; shift 2 ;;
    --into)   TARGET="${2:?--into needs a database name}"; shift 2 ;;
    --yes)    CONFIRM=yes; shift ;;
    *) die "unknown argument: $1" ;;
  esac
done

# Browsing and --latest both need s3:ListBucket. If the credential in use is a
# strict PutObject-only backup identity it won't have it — say so, and point at
# --key, which needs only GetObject and is the path that matters in a real
# recovery anyway.
list_backups() {
  local out
  if ! out=$(aws "${AWS_ARGS[@]}" s3 ls "${S3_BASE}/" --recursive 2>&1) \
     || grep -qi "AccessDenied" <<<"$out"; then
    cat >&2 <<EOF
FATAL: cannot list ${S3_BASE}/ — this credential lacks s3:ListBucket.

Either use a credential with ListBucket, or restore by explicit key:
    $0 --key <full/object/key> --into <database>
Keys look like: ${BACKUP_S3_PREFIX}/YYYY/MM/chemistry-<timestamp>.sql.gz
EOF
    exit 1
  fi
  sort <<<"$out"
}

if [[ "$MODE" == "list" || -z "$MODE" ]]; then
  log "backups under ${S3_BASE}/"
  list_backups | tail -40
  [[ -z "$MODE" ]] && echo && echo "Pass --latest or --key <key>, plus --into <database>."
  exit 0
fi

[[ -n "$TARGET" ]] || die "--into <database> is required (use a scratch name to test safely)"

if [[ "$MODE" == "latest" ]]; then
  KEY=$(list_backups | tail -1 | awk '{print $4}')
  [[ -n "$KEY" ]] || die "no backups found"
fi
log "using s3://${BACKUP_S3_BUCKET}/${KEY}"

# Overwriting the live database is the one genuinely dangerous thing here.
if [[ "$TARGET" == "$PG_DB" && "$CONFIRM" != "yes" ]]; then
  cat >&2 <<EOF

  REFUSING: --into '$TARGET' is the LIVE database.

  This drops and recreates every table. If you mean it, re-run with --yes.
  If you're testing that backups work, restore into a scratch database instead:

      $0 --latest --into chemistry_restore_test

EOF
  exit 1
fi

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
log "downloading"
aws "${AWS_ARGS[@]}" s3 cp "s3://${BACKUP_S3_BUCKET}/${KEY}" "$TMP/dump.sql.gz" --only-show-errors
gzip -t "$TMP/dump.sql.gz" || die "downloaded archive is corrupt"

# Create the target if it doesn't exist. Never silently reuse an existing
# scratch DB's contents — drop and recreate so the test is honest.
if [[ "$TARGET" != "$PG_DB" ]]; then
  log "recreating scratch database ${TARGET}"
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"$TARGET\";" >/dev/null
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d postgres \
    -c "CREATE DATABASE \"$TARGET\";" >/dev/null
fi

log "restoring into ${TARGET}"
# --clean --if-exists in the dump means this is safe to run over an existing DB.
zcat "$TMP/dump.sql.gz" | docker exec -i "$PG_CONTAINER" \
  psql -U "$PG_USER" -d "$TARGET" -v ON_ERROR_STOP=1 --quiet >/dev/null

log "verifying"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$TARGET" -t -c "
  SELECT 'assets=' || (SELECT count(*) FROM \"Asset\")
      || ' work_orders=' || (SELECT count(*) FROM \"WorkOrder\")
      || ' users=' || (SELECT count(*) FROM \"User\")
      || ' audit=' || (SELECT count(*) FROM \"AuditLog\");"

log "restore complete into '${TARGET}'"
if [[ "$TARGET" != "$PG_DB" ]]; then
  echo
  echo "Scratch restore only — the live database was untouched."
  echo "Drop it when you're done:"
  echo "  docker exec $PG_CONTAINER psql -U $PG_USER -d postgres -c 'DROP DATABASE \"$TARGET\";'"
fi
