#!/usr/bin/env bash
# Admin shell test: typecheck, lint, then HTTP smoke against a locally started app.
# Platform: PLATFORM_API_URL (default http://localhost:8081, the Go API); starts ../../numerix-api/bin/api.exe when it is not reachable.
set -u
cd "$(dirname "$0")/.."
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-test-password-123}"
export ADMIN_SESSION_SECRET="${ADMIN_SESSION_SECRET:-test-secret-test-secret-test-secret-1234}"
export ADMIN_API_TOKEN="${ADMIN_API_TOKEN:-dev-admin-token}"
export PLATFORM_API_URL="${PLATFORM_API_URL:-http://localhost:8081}"
PORT="${ADMIN_PORT:-3100}"
export ADMIN_URL="http://localhost:$PORT"
pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null; done; taskkill //F //IM api-admin.exe >/dev/null 2>&1; }
trap cleanup EXIT

npx tsc --noEmit && echo "PASS typecheck" || { echo "FAIL typecheck"; exit 1; }
npx eslint && echo "PASS lint" || { echo "FAIL lint"; exit 1; }

if ! curl -sf -o /dev/null -H "Authorization: Bearer $ADMIN_API_TOKEN" "$PLATFORM_API_URL/admin/v1/overview"; then
  API_DIR="../../numerix-api"
  [ -x "$API_DIR/bin/api.exe" ] || (cd "$API_DIR" && PATH="$PATH:/c/Program Files/Go/bin" go build -o bin/api.exe ./cmd/api)
  cp "$API_DIR/bin/api.exe" "$API_DIR/bin/api-admin.exe"
  (cd "$API_DIR" && PORT="${PLATFORM_API_URL##*:}" env -u ADMIN_API_TOKEN APP_ENV=development DB_PATH=./data/admin-test.db ./bin/api-admin.exe > /tmp/admin-platform.log 2>&1 &)
  for _ in $(seq 1 40); do curl -sf -o /dev/null -H "Authorization: Bearer $ADMIN_API_TOKEN" "$PLATFORM_API_URL/admin/v1/overview" && break; sleep 0.5; done
  node ../scripts/seed-dev.mjs "$PLATFORM_API_URL/v1" > /dev/null || echo "seed failed"  # a parent with two children, through the real endpoints
fi
npx next build > /tmp/admin-build.log 2>&1 && echo "PASS build" || { tail -30 /tmp/admin-build.log; echo "FAIL build"; exit 1; }
PORT=$PORT npx next start -p "$PORT" > /tmp/admin-start.log 2>&1 & pids+=($!)
for _ in $(seq 1 40); do curl -s -o /dev/null "$ADMIN_URL/login" && break; sleep 0.5; done
node scripts/smoke.mjs
