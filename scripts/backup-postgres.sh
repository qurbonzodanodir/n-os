#!/bin/sh
set -eu

backup_dir="${N_OS_BACKUP_DIR:-/opt/n-os/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/n-os-$timestamp.sql.gz"
temporary="$target.tmp"

umask 077
mkdir -p "$backup_dir"
docker compose exec -T postgres pg_dump -U n_os -d n_os | gzip > "$temporary"
gzip -t "$temporary"
mv "$temporary" "$target"

# Keep two weeks of daily backups. Version history inside PostgreSQL covers
# short-term mistakes; these files cover database/container loss.
find "$backup_dir" -type f -name 'n-os-*.sql.gz' -mtime +14 -delete
printf '%s\n' "$target"
