#!/usr/bin/env bash
set -euo pipefail
cinema_deploy_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec docker compose --env-file "$cinema_deploy_dir/.env.production" -f "$cinema_deploy_dir/compose.yml" "$@"
