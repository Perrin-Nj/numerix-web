#!/usr/bin/env bash
# One entry point for every automated check. One line per check, nothing else.
#   bash scripts/test.sh            all local checks (state, sounds, mock, flows, ui)
#   bash scripts/test.sh state      pure game-state selectors (node, instant)
#   bash scripts/test.sh mock       mock backend self test
#   bash scripts/test.sh flows      HTTP flows through the app
#   bash scripts/test.sh ui         browser checks (kid door, feed, chapter, theme, exit, map...)
#   bash scripts/test.sh live       flows + ui against the deployed app (LIVE_URL, default numerix-web-snowy)
set -u
cd "$(dirname "$0")/.."
MODE="${1:-all}"
STARTED=()
FAILS=0
BASE="${BASE_URL:-http://localhost:3000}"
MOCK_URL="${MOCK_URL:-http://localhost:8081}"

up() { curl -s -o /dev/null --max-time 2 "$1"; }
killport() { local pid; pid=$(netstat -ano 2>/dev/null | grep ":$1 " | grep LISTENING | awk '{print $5}' | head -1); [ -n "$pid" ] && { taskkill //PID "$pid" //T //F >/dev/null 2>&1 || kill "$pid" 2>/dev/null; }; }
stop_all() { for port in "${STARTED[@]:-}"; do [ -n "$port" ] && killport "$port"; done; }
trap stop_all EXIT

run() { # name command...
  local name="$1"; shift
  local out; out=$("$@" 2>&1); local code=$?
  echo "$out" | grep -E "^(ok|FAIL|console errors|[0-9]+ FAILED|all .* pass|.* (ok|passed)( \(.*\))?$)" | sed "s/^/[$name] /"
  [ $code -ne 0 ] && { echo "[$name] FAILED (exit $code)"; echo "$out" | grep -vE "^(ok|Warning|\(node|Reparsing|To eliminate)" | tail -5; FAILS=$((FAILS+1)); }
}

ensure_mock() {
  up "$MOCK_URL/__admin/health" && return
  node mock/dev.mjs 8081 >/dev/null 2>&1 &
  STARTED+=(8081)
  for _ in $(seq 1 20); do up "$MOCK_URL/__admin/health" && return; sleep 0.5; done
  echo "[mock] could not start on :8081"; FAILS=$((FAILS+1))
}

ensure_app() {
  ensure_mock
  up "$BASE/api/health" && return
  pnpm exec next dev >/dev/null 2>&1 &
  STARTED+=(3000)
  for _ in $(seq 1 60); do up "$BASE/api/health" && return; sleep 1; done
  echo "[app] could not start on :3000"; FAILS=$((FAILS+1))
}

case "$MODE" in
  state)  run state node scripts/state-checks.mjs; run spoken node scripts/check-spoken.mjs; run voices node scripts/check-voices.mjs; run coach node scripts/check-coach.mjs; run scene node scripts/check-scene-layout.mjs; run cards node scripts/check-card-styles.mjs ;;
  sounds) run sounds node scripts/check-sounds.mjs; run variants node scripts/check-sound-variants.mjs ;;
  mock)   ensure_mock; run mock node mock/scripts/selftest.mjs "$MOCK_URL" ;;
  flows)  ensure_app; run flows node scripts/flows.mjs "$BASE" ;;
  ui)     ensure_app; run ui node scripts/ui-checks.mjs "$BASE" ;;
  live)   LIVE="${LIVE_URL:-https://numerix-web-snowy.vercel.app}"
          run flows node scripts/flows.mjs "$LIVE"; run ui node scripts/ui-checks.mjs "$LIVE" ;;
  all)    run state node scripts/state-checks.mjs; run spoken node scripts/check-spoken.mjs; run voices node scripts/check-voices.mjs; run coach node scripts/check-coach.mjs; run scene node scripts/check-scene-layout.mjs; run cards node scripts/check-card-styles.mjs
          run sounds node scripts/check-sounds.mjs; run variants node scripts/check-sound-variants.mjs
          ensure_mock; run mock node mock/scripts/selftest.mjs "$MOCK_URL"
          ensure_app; run flows node scripts/flows.mjs "$BASE"; run ui node scripts/ui-checks.mjs "$BASE" ;;
  *)      echo "unknown mode: $MODE"; exit 2 ;;
esac

[ $FAILS -eq 0 ] && echo "ALL GOOD" || echo "$FAILS SUITE(S) FAILED"
exit $FAILS
