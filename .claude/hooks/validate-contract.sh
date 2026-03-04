#!/bin/bash
# Guard: prevent infinite hook loops
[ "${stop_hook_active:-}" = "1" ] && exit 0
export stop_hook_active=1

# Skip if no TypeScript source files were modified (fast path)
changed=$(git -C /home/cf2621/workspace/AJB-AiOC status --short 2>/dev/null | awk '{print $2}')
if ! echo "$changed" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# Prevent nested Claude Code hook conflicts
unset CLAUDECODE

ROOT=/home/cf2621/workspace/AJB-AiOC
BUN=$(which bun 2>/dev/null || echo "$HOME/.bun/bin/bun")
TSC="$ROOT/node_modules/.bin/tsc"

# --- bun build: compile api-server binary (proves TS + deps resolve) ----------
result_bun=$("$BUN" build "$ROOT/api-server/src/index.ts" \
  --compile --target=bun --outfile=/tmp/ajb-api-server-check 2>&1)
ec_bun=$?
rm -f /tmp/ajb-api-server-check

# --- tsc --noEmit: type-check contract, api-server, frontend ------------------
result_contract=$("$TSC" --project "$ROOT/contract/tsconfig.json" --noEmit 2>&1)
ec_contract=$?

result_api=$("$TSC" --project "$ROOT/api-server/tsconfig.json" --noEmit 2>&1)
ec_api=$?

result_frontend=$("$TSC" --project "$ROOT/frontend/tsconfig.json" --noEmit 2>&1)
ec_frontend=$?

if [ $ec_bun -ne 0 ] || [ $ec_contract -ne 0 ] || [ $ec_api -ne 0 ] || [ $ec_frontend -ne 0 ]; then
  echo "BUILD/TYPE ERRORS DETECTED:"
  [ $ec_bun -ne 0 ]      && echo "=== bun build (api-server) ===" && echo "$result_bun"
  [ $ec_contract -ne 0 ] && echo "=== contract/ ===" && echo "$result_contract"
  [ $ec_api -ne 0 ]      && echo "=== api-server/ ===" && echo "$result_api"
  [ $ec_frontend -ne 0 ] && echo "=== frontend/ ===" && echo "$result_frontend"
  exit 1
fi

exit 0
