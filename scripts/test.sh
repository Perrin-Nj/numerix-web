#!/usr/bin/env bash
# One entry point for every automated check. One line per check, nothing else.
#   bash scripts/test.sh            all local checks (state, sounds, flows, ui)
#   bash scripts/test.sh state      pure node checks (spoken, voices, coach, scene, cards)
#   bash scripts/test.sh arch       layer arrows and documentation coverage
#   bash scripts/test.sh flows      HTTP flows through the app
#   bash scripts/test.sh ui         browser checks (kid door, feed, chapter, theme, exit, map...)
#   bash scripts/test.sh errors     error screens: 404, API failure, offline, never-answering endpoint
#   bash scripts/test.sh mobile     phone layout audit (overflow, touch targets, text size)
#   bash scripts/test.sh play       world map, journeys, every question kind, credits (seeded question bank)
#   API_PORT=8083 APP_PORT=3101 bash scripts/test.sh ui     same, on other ports (never touches 3000 and 8081)
#   bash scripts/test.sh contract   openapi vs frontend calls vs backend guide (no servers needed)
#   bash scripts/test.sh live      flows + ui against the deployed app (LIVE_URL, default numerix-web-snowy)
set -u
cd "$(dirname "$0")/.."
MODE="${1:-all}"
STARTED=()
FAILS=0
# Ports are settable so a run never touches a dev server or API someone else keeps on 3000 and 8081.
# SEED_CONTENT=1 loads the question bank (cmd/seed) into the fresh database: the `play` mode needs it.
API_PORT="${API_PORT:-8081}"
APP_PORT="${APP_PORT:-3000}"
BASE="${BASE_URL:-http://localhost:$APP_PORT}"
API_HEALTH="${API_HEALTH:-http://localhost:$API_PORT/v1/health}"

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

ensure_api() {
  up "$API_HEALTH" && return
  local dir="../numerix-api"
  [ -x "$dir/bin/api.exe" ] || (cd "$dir" && PATH="$PATH:/c/Program Files/Go/bin" go build -o bin/api.exe ./cmd/api) || { echo "[api] build failed"; FAILS=$((FAILS+1)); return; }
  local db="./data/test-$API_PORT.db"
  rm -f "$dir"/data/test-$API_PORT.db*  # a fresh database per run, so no test depends on old data
  cp "$dir/bin/api.exe" "$dir/bin/api-web-$API_PORT.exe" 2>/dev/null  # own copy, so other tools that kill api.exe by name leave this one alone
  (cd "$dir" && PORT=$API_PORT APP_ENV=development DB_PATH=$db FEATURE_WELCOME_GIFT=true ./bin/api-web-$API_PORT.exe >/dev/null 2>&1 &)
  STARTED+=($API_PORT)
  for _ in $(seq 1 20); do up "$API_HEALTH" && break; sleep 0.5; done
  up "$API_HEALTH" || { echo "[api] could not start on :$API_PORT"; FAILS=$((FAILS+1)); return; }
  if [ -n "${SEED_CONTENT:-}" ]; then (cd "$dir" && PATH="$PATH:/c/Program Files/Go/bin" go run ./cmd/seed --db "$db" --exclude _examples >/dev/null 2>&1) || { echo "[api] content seed failed"; FAILS=$((FAILS+1)); }; fi
  node scripts/seed-dev.mjs "http://localhost:$API_PORT/v1" >/dev/null 2>&1 || echo "[api] seed failed"
}

ensure_app() {
  ensure_api
  up "$BASE/api/health" && return
  export NEXT_PUBLIC_FEATURE_WELCOME_GIFT=true NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI=true API_URL="http://localhost:$API_PORT/v1"
  # a second copy of the app gets its own build folder
  [ "$APP_PORT" != 3000 ] && export NX_DIST=".next-$APP_PORT"
  # A production build by default: next dev recompiles and reloads pages under the browser checks and makes them flaky. NX_DEV=1 for dev.
  if [ -n "${NX_DEV:-}" ]; then pnpm exec next dev -p "$APP_PORT" >/dev/null 2>&1 &
  else pnpm gen:messages >/dev/null 2>&1; pnpm exec next build >/dev/null 2>&1 || { echo "[app] build failed"; FAILS=$((FAILS+1)); return; }; pnpm exec next start -p "$APP_PORT" >/dev/null 2>&1 &
  fi
  STARTED+=($APP_PORT)
  for _ in $(seq 1 60); do up "$BASE/api/health" && return; sleep 1; done
  echo "[app] could not start on :$APP_PORT"; FAILS=$((FAILS+1))
}

# Next dev compiles each route on first hit (up to a minute for the heaviest): visit them once before the browser runs
warm() {
  for p in / /play /play/home /play/feed /play/worlds /play/challenges /play/collection /play/me /parent /parent/login /parent/register /parent/subscription /does-not-exist; do
    curl -s -o /dev/null --max-time 120 "$BASE$p"
  done
}

case "$MODE" in
  state)  run spoken node scripts/check-spoken.mjs; run voices node scripts/check-voices.mjs; run coach node scripts/check-coach.mjs; run scene node scripts/check-scene-layout.mjs; run cards node scripts/check-card-styles.mjs ;;
  contract) run contract node scripts/api-inventory.mjs ;;
  arch)   run architecture node scripts/check-architecture.mjs; run docs node scripts/check-docs.mjs ;;
  sounds) run sounds node scripts/check-sounds.mjs; run visual node scripts/check-method-visual.mjs; run variants node scripts/check-sound-variants.mjs ;;
  flows)  ensure_app; run flows node scripts/flows.mjs "$BASE" ;;
  ui)     ensure_app; warm; run ui node scripts/ui-checks.mjs "$BASE" ;;
  errors) ensure_app; warm; run errors node scripts/ui-error-checks.mjs "$BASE" ;;
  mobile) ensure_app; warm; run mobile node scripts/mobile-audit.mjs "$BASE" ;;
  play)   SEED_CONTENT=1 ensure_app; warm; run play node scripts/play-checks.mjs "$BASE" ;;
  live)   LIVE="${LIVE_URL:-https://numerix-web-snowy.vercel.app}"
          run flows node scripts/flows.mjs "$LIVE"; NX_GIFT=0 run ui node scripts/ui-checks.mjs "$LIVE"; run errors node scripts/ui-error-checks.mjs "$LIVE" ;;
  all)    run contract node scripts/api-inventory.mjs; run spoken node scripts/check-spoken.mjs; run voices node scripts/check-voices.mjs; run coach node scripts/check-coach.mjs; run scene node scripts/check-scene-layout.mjs; run cards node scripts/check-card-styles.mjs
          run sounds node scripts/check-sounds.mjs; run visual node scripts/check-method-visual.mjs; run variants node scripts/check-sound-variants.mjs
          ensure_app; warm; run flows node scripts/flows.mjs "$BASE"; run ui node scripts/ui-checks.mjs "$BASE"; run errors node scripts/ui-error-checks.mjs "$BASE"; run mobile node scripts/mobile-audit.mjs "$BASE" ;;
  *)      echo "unknown mode: $MODE"; exit 2 ;;
esac

[ $FAILS -eq 0 ] && echo "ALL GOOD" || echo "$FAILS SUITE(S) FAILED"
exit $FAILS
