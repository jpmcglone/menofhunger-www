#!/usr/bin/env bash
# Local developer setup. Run from any directory; existing configuration is preserved.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SETUP_ONLY=false
case "${1:-}" in
  --setup-only) SETUP_ONLY=true ;;
  --help|-h)
    printf 'Usage: ./init.sh [--setup-only]\nSet up local development; --setup-only skips launching the app.\n'
    exit 0 ;;
  '') ;;
  *) printf 'Unknown argument: %s\n' "$1" >&2; exit 1 ;;
esac
if [ "$#" -gt 1 ]; then
  printf 'Expected at most one argument. Run ./init.sh --help.\n' >&2
  exit 1
fi
require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing %s. %s\n' "$1" "$2" >&2
    exit 1
  fi
}

require node "Install Node $(cat .nvmrc), then rerun ./init.sh."
require npm 'Install npm with Node, then rerun ./init.sh.'
node <<'NODE'
const fs = require('node:fs');
const required = fs.readFileSync('.nvmrc', 'utf8').trim().split('.').map(Number);
const actual = process.versions.node.split('.').map(Number);
const difference = actual.map((v, i) => v - required[i]).find(v => v !== 0) || 0;
if (difference < 0) {
  console.error(`Node ${required.join('.')} or newer is required; found ${process.versions.node}.`);
  process.exit(1);
}
NODE

if [ ! -f .env ]; then
  cp env.example .env
  printf 'Created .env from env.example (local API on port 3001).\n'
fi
printf 'Installing locked dependencies and preparing Nuxt…\n'
npm ci
printf '\nWebsite setup complete. Start the sibling API with its ./init.sh first.\n'
printf 'Default website: http://localhost:3000; local login code: 000000.\n'
if [ "$SETUP_ONLY" = true ]; then
  printf 'Start with: npm run dev\n'
  exit 0
fi
exec npm run dev
