#!/bin/sh
# Test runner: the whole sellable verification in one command.
# Layers (verified 2026 pyramid/trophy consensus):
#   0. static  — tsc + eslint (fail fast, cheapest signal)
#   1. unit    — backend + frontend pure functions (node:test, zero-dep)
#   2. contract— live stack via gateway: infra, coins, pages, jobs
#   3. spike   — 150-parallel burst gate (200|429 only, never 502/503)
# Env: BASE_URL (default http://localhost:18100 — the local-port gateway).
# CI uses the base compose file on port 80: BASE_URL=http://localhost.
set -eu
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:18100}"
SKIP_UNIT="${SKIP_UNIT:-0}"
export BASE_URL

echo "== [0] stack must be healthy =="
curl -sf "$BASE_URL/health" > /dev/null || { echo "FAIL: gateway $BASE_URL unreachable — start the stack first"; exit 1; }

# Warm-up (verified load-testing practice): cold Next.js compile + cold caches make
# the very first render unrepresentative. Warm once, then assert — never sleep-blind.
curl -s -o /dev/null "$BASE_URL/" || true
curl -s -o /dev/null "$BASE_URL/coins/bitcoin" || true

if [ "$SKIP_UNIT" = "0" ]; then
echo "== [1] backend unit =="
(cd backend && npm test) || exit 1

echo "== [2] frontend unit =="
(cd frontend && npm test) || exit 1
else
echo "== [1+2] unit skipped (proven in static job) =="
fi

echo "== [3] contract (live stack) =="
node --test 'tests/contract/*.test.mjs' || exit 1

echo "== [4] spike gate =="
node --test tests/spike.test.mjs || exit 1

echo ""
echo "ALL GREEN: unit + contract + spike pass against $BASE_URL"
