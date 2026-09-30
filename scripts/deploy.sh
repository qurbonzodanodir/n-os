#!/bin/sh
# Deploy the current origin/main on the server: back up, pull, build, restart,
# verify /ready and roll back to the previous images and commit if it fails.
# Usage: cd /opt/n-os && sh scripts/deploy.sh
set -eu

cd "$(dirname "$0")/.."

services="backend frontend"
project="$(basename "$(pwd)")"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has local changes; refusing to deploy." >&2
  exit 1
fi

previous="$(git rev-parse HEAD)"

echo "==> Backing up the database"
sh scripts/backup-postgres.sh

echo "==> Tagging current images for rollback"
for service in $services; do
  image="$(docker compose images "$service" --format json 2>/dev/null | sed -n 's/.*"Repository":"\([^"]*\)".*/\1/p' | head -n 1)"
  image="${image:-$project-$service}"
  docker tag "$image:latest" "$image:rollback" 2>/dev/null || true
done

echo "==> Pulling"
git pull --ff-only
current="$(git rev-parse HEAD)"
if [ "$previous" = "$current" ]; then
  echo "Already up to date ($current); rebuilding anyway."
fi

healthy() {
  i=0
  while [ "$i" -lt 30 ]; do
    if docker compose exec -T backend python -c \
      "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/v1/ready',timeout=3)" \
      >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

echo "==> Building and starting"
if docker compose build && docker compose up -d && healthy; then
  echo "==> Deployed $previous -> $current"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

echo "==> Deploy failed; rolling back to $previous" >&2
git reset --hard "$previous"
for service in $services; do
  image="$project-$service"
  docker tag "$image:rollback" "$image:latest" 2>/dev/null || true
done
docker compose up -d --no-build
if healthy; then
  echo "Rolled back. Check the failed build before deploying again." >&2
else
  echo "Rollback is not healthy either; inspect: docker compose logs" >&2
fi
exit 1
