#!/usr/bin/env bash
set -euo pipefail

# This is installed as the forced command for the GitHub Actions public key.
# The key may run only a deployment for a commit from origin/main.
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
	exec /var/www/cinema/deploy/deploy-main.sh "${BASH_REMATCH[1]}"
fi

echo "Only 'deploy <40-character commit SHA>' is allowed" >&2
exit 1
