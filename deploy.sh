#!/usr/bin/env bash
# Ships Agent Bazaar (Cloudflare Pages + D1) to https://bazaar.saylorinnovations.com.
#
#   ./deploy.sh            deploy the site (code only; does not read D1, so it works
#                          even while the free-tier daily read quota is exhausted)
#   ./deploy.sh --migrate  apply migrations/0009 (the calls_30d ordering index) to the
#                          REMOTE database. Do this AFTER 00:00 UTC on a day the quota
#                          isn't exhausted, since building an index reads every row.
#
# Why this exists: wrangler is a local dependency (not on PATH), needs Node 22 (the
# system Node is old), and a stale CLOUDFLARE_API_TOKEN in the environment overrides
# the working `wrangler login`. And --branch=master is REQUIRED: wrangler takes the
# branch from git, and Pages only treats the production branch as live — any other
# branch (e.g. `redesign`) ships as an unlisted Preview.
set -euo pipefail
cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null
unset CLOUDFLARE_API_TOKEN

node -e 'process.exit(parseInt(process.versions.node) >= 20 ? 0 : 1)' \
  || { echo "ERROR: need Node 20+ (found $(node -v)). Run: nvm install 22"; exit 1; }

if [ "${1:-}" = "--migrate" ]; then
  npx wrangler d1 execute open-x402-bazaar --remote --file=migrations/0009_calls_order_index.sql
  echo "Migration 0009 applied."
  exit 0
fi

npm test
npx wrangler pages deploy public --project-name open-x402-bazaar --branch=master --commit-dirty=true

echo
echo "Verify: https://bazaar.saylorinnovations.com/ should show the new header (class site-header),"
echo "and /search should return 200 (or a friendly 503 while D1 is over quota)."
