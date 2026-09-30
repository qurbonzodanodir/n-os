#!/bin/sh
# Prove that the newest backup restores: load it into a throw-away database,
# check the schema and row counts, then drop the database. Never touches n_os.
# Usage: cd /opt/n-os && sh scripts/restore-check.sh [backup.sql.gz]
set -eu

cd "$(dirname "$0")/.."

backup_dir="${N_OS_BACKUP_DIR:-/opt/n-os/backups}"
backup="${1:-$(ls -1t "$backup_dir"/n-os-*.sql.gz | head -n 1)}"
scratch="n_os_restore_check"

[ -f "$backup" ] || { echo "No backup found." >&2; exit 1; }
gzip -t "$backup"
echo "==> Restoring $backup into $scratch"

psql() { docker compose exec -T postgres psql -U n_os -v ON_ERROR_STOP=1 "$@"; }

psql -d postgres -c "DROP DATABASE IF EXISTS $scratch" >/dev/null
psql -d postgres -c "CREATE DATABASE $scratch" >/dev/null
trap 'psql -d postgres -c "DROP DATABASE IF EXISTS $scratch" >/dev/null 2>&1 || true' EXIT

gzip -dc "$backup" | psql -d "$scratch" -q >/dev/null

tables="$(psql -d "$scratch" -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
[ "$tables" -ge 2 ] || { echo "Restore produced only $tables tables." >&2; exit 1; }

psql -d "$scratch" -tA -c "SELECT 'workspaces', count(*) FROM workspace_documents" || true
psql -d "$scratch" -tA -c "SELECT 'revisions', count(*) FROM workspace_revisions" || true
echo "==> OK: $backup restores cleanly ($tables tables)"
