#!/bin/sh
# Compare committed migrations with schema.prisma.
# Uses a separate shadow database so the app database is left untouched.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
cd "$root/apps/api"

if [ ! -f .env ]; then
	echo "prisma check: apps/api/.env is missing (DATABASE_URL)" >&2
	exit 1
fi

DATABASE_URL=$(awk -F= '/^DATABASE_URL=/{print substr($0, index($0, "=") + 1); exit}' .env)
if [ -z "$DATABASE_URL" ]; then
	echo "prisma check: DATABASE_URL is empty" >&2
	exit 1
fi
export DATABASE_URL

SHADOW_DATABASE_URL=$(node -e '
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/cinema_shadow";
url.search = "";
url.hash = "";
process.stdout.write(url.toString());
')

compose="$root/docker-compose.yml"
if ! docker compose -f "$compose" exec -T postgres psql -U cinema -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'cinema_shadow'" | grep -q 1; then
	docker compose -f "$compose" exec -T postgres psql -U cinema -d postgres -c "CREATE DATABASE cinema_shadow" >/dev/null
fi

pnpm exec prisma validate
pnpm exec prisma migrate diff \
	--from-migrations prisma/migrations \
	--to-schema-datamodel prisma/schema.prisma \
	--shadow-database-url "$SHADOW_DATABASE_URL" \
	--exit-code
