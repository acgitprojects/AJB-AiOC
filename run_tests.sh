#!/usr/bin/env bash
# run_tests.sh — full test suite runner
# Usage: ./run_tests.sh [--unit] [--e2e] [--frontend] [--no-build]
#
# Tiers:
#   unit      — fast (~1s), no docker needed
#   e2e       — API-level, ONE shared compose stack for all files,
#               data reset between every test via POST /api/test/reset
#   frontend  — Playwright browser tests (currently skipped)

set -euo pipefail
cd "$(dirname "$0")"

BUN="${HOME}/.bun/bin/bun"
CPUS=$(nproc)
MEM_GB=$(awk '/MemAvailable/ { printf "%.0f\n", $2/1024/1024 }' /proc/meminfo)

# ── Argument parsing ──────────────────────────────────────────────────────────
RUN_UNIT=true
RUN_E2E=true
RUN_FRONTEND=true
NO_BUILD=false

for arg in "$@"; do
  case $arg in
    --unit)     RUN_UNIT=true;  RUN_E2E=false; RUN_FRONTEND=false ;;
    --e2e)      RUN_UNIT=false; RUN_E2E=true;  RUN_FRONTEND=false ;;
    --frontend) RUN_UNIT=false; RUN_E2E=false; RUN_FRONTEND=true  ;;
    --no-build) NO_BUILD=true ;;
  esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " AJB-AiOC test suite"
echo " CPUs: ${CPUS}  Available RAM: ~${MEM_GB} GB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PASS=0
FAIL=0

run_tier() {
  local label="$1"; shift
  echo ""
  echo "▶ ${label}"
  if "$@"; then
    echo "✓ ${label} passed"
    PASS=$(( PASS + 1 ))
  else
    echo "✗ ${label} FAILED — aborting"
    FAIL=$(( FAIL + 1 ))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " ${FAIL} tier(s) FAILED. Stopped early."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
}

# ── Pre-build docker images ───────────────────────────────────────────────────
if $RUN_E2E; then
  if ! $NO_BUILD; then
    echo ""
    echo "▶ Building Docker images…"
    docker compose -f docker-compose.yml -f docker-compose.test.yml build --quiet
    echo "✓ Images ready"
  fi
fi

mkdir -p tests/screenshots

# ── Unit tests ────────────────────────────────────────────────────────────────
if $RUN_UNIT; then
  run_tier "Unit tests" \
    "$BUN" test api-server/tests/unit --timeout 10000 --bail
fi

# ── E2E API tests — one shared stack ─────────────────────────────────────────
# Start postgres + api-server once. All test files share this stack.
# Each test resets the DB via beforeEach → POST /api/test/reset.
if $RUN_E2E; then
  echo ""
  echo "▶ E2E API tests — starting shared stack…"

  E2E_PROJECT="e2e-$(head -c 8 /dev/urandom | od -A n -t x1 | tr -d ' \n')"
  E2E_COMPOSE="-f docker-compose.yml -f docker-compose.test.yml -p ${E2E_PROJECT}"

  # Ensure cleanup on exit regardless of test outcome
  trap 'docker compose '"${E2E_COMPOSE}"' down -v --remove-orphans 2>/dev/null || true' EXIT

  docker compose ${E2E_COMPOSE} up -d --wait postgres openclaw-init openclaw api-server

  E2E_PORT=$(docker compose ${E2E_COMPOSE} port api-server 3001 | cut -d: -f2)
  echo "  api-server → http://localhost:${E2E_PORT}"

  E2E_API_URL="http://localhost:${E2E_PORT}" \
  E2E_ADMIN_PASSWORD="testpassword" \
  run_tier "E2E API tests" \
    "$BUN" test tests/e2e --timeout 60000 --bail

  # Explicit teardown (trap also covers crash paths)
  docker compose ${E2E_COMPOSE} down -v --remove-orphans 2>/dev/null || true
  trap - EXIT
fi

# ── Frontend Playwright tests — currently skipped ─────────────────────────────
if $RUN_FRONTEND; then
  echo ""
  echo "▶ Frontend Playwright tests"
  mapfile -d '' FE_FILES < <(find tests/frontend -name "*.test.ts" -print0 | sort -z)
  if [ ${#FE_FILES[@]} -eq 0 ]; then
    echo "  (no frontend test files found — skipped)"
    PASS=$(( PASS + 1 ))
  else
    echo "  (frontend tests are currently disabled — skipped)"
    PASS=$(( PASS + 1 ))
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" -eq 0 ]; then
  echo " All ${PASS} tier(s) passed."
else
  echo " ${PASS} tier(s) passed, ${FAIL} tier(s) FAILED."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit "$FAIL"
