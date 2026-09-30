#!/usr/bin/env bash
set -euo pipefail

target_sha="${1:?Expected Git commit SHA}"
[[ "$target_sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 1; }

exec 9>/var/lock/cinema-deploy.lock
flock -w 600 9

cd /var/www/cinema
test -f deploy/.env.production || { echo "Production env file is missing" >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo "Checkout has uncommitted changes" >&2; exit 1; }

git fetch origin main
if [[ "$(git rev-parse origin/main)" != "$target_sha" ]]; then
	echo "A newer main commit exists; skipping superseded deployment $target_sha"
	exit 0
fi
git switch -C main "$target_sha"
git branch --set-upstream-to=origin/main main

mkdir -p deploy/backups
chmod 700 deploy/backups
umask 077
backup="deploy/backups/cinema-$(date -u +%Y%m%dT%H%M%SZ)-${target_sha:0:12}.dump"
./deploy/compose.sh exec -T postgres pg_dump -U cinema -d cinema -Fc > "$backup"
test -s "$backup" || { echo "Database backup failed" >&2; exit 1; }

./deploy/compose.sh --profile bot build api
./deploy/compose.sh --profile bot up -d --no-build
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors \
	"https://cinema-api.109.199.98.232.sslip.io/health"
echo "Deployed $target_sha"
