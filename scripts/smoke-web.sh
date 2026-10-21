#!/usr/bin/env bash
# Smoke test of a deployed web app (and optionally the admin app). One line per check, exit 1 if any check fails.
#   bash scripts/smoke-web.sh https://app.example.ca [https://admin.example.ca]
# Optional env:
#   SMOKE_WRITE=1     register a throw-away parent through the web app, check the session, then delete the account
#                     (STAGING ONLY, never production)
#   SMOKE_RETRIES=20  how many times (3 s apart) to wait for the first answer after a restart
# shellcheck disable=SC2015 # ok() and bad() never fail, so "A && ok || bad" is a real if/else here
set -uo pipefail
WEB="${1:?usage: bash scripts/smoke-web.sh https://app.example.ca [https://admin.example.ca]}"
WEB="${WEB%/}"
ADMIN="${2:-}"
ADMIN="${ADMIN%/}"
FAILS=0
ok() { echo "ok   $*"; }
bad() { echo "FAIL $*"; FAILS=$((FAILS + 1)); }
code() { curl -s -o /dev/null -w '%{http_code}' -m 15 "$@" || echo 000; }
for u in "$WEB" "$ADMIN"; do
  [[ -z "$u" || "$u" == https://* || "$u" == http://127.0.0.1* || "$u" == http://localhost* ]] || { echo "refusing a non-https remote URL: $u"; exit 2; }
done

# 1. The app answers (wait loop: a restart takes a few seconds).
health=""
for _ in $(seq 1 "${SMOKE_RETRIES:-20}"); do
  health="$(curl -fsS -m 5 "$WEB/api/health" 2>/dev/null)" && break
  sleep 3
done
[[ "$health" == *'"app":"ok"'* ]] && ok "web app answers" || bad "web health: '${health:0:140}'"
[[ "$health" == *'"backend":"ok"'* ]] && ok "web app reaches the API" || bad "web app cannot reach the API: '${health:0:200}'"

# 2. Main pages render.
home="$(curl -s -m 15 "$WEB/")"
[[ "$home" == *"<html"* ]] && ok "home page renders" || bad "home page has no html"
for path in /parent/login /play /credits; do
  c="$(code "$WEB$path")"
  [[ "$c" == 200 ]] && ok "$path: 200" || bad "$path: $c (want 200)"
done

# 3. The proxy to the API works and the API answers through it.
[ "$(code "$WEB/api/v1/health")" = 200 ] && ok "/api/v1/health through the proxy" || bad "/api/v1/health through the proxy"

# 4. Security headers (self-hosted builds set them in next.config.ts; Vercel sets them from vercel.ts).
hdr="$(curl -sI -m 15 "$WEB/")"
for h in 'content-security-policy' 'x-content-type-options: nosniff' 'x-frame-options: deny' 'referrer-policy'; do
  grep -qi "^$h" <<<"$hdr" && ok "header $h" || bad "missing header $h"
done
if [[ "$WEB" == https://* ]]; then
  grep -qi '^strict-transport-security' <<<"$hdr" && ok "header strict-transport-security" || bad "missing header strict-transport-security"
  host="${WEB#https://}"; host="${host%%/*}"
  if command -v openssl >/dev/null; then
    echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -checkend $((14 * 86400)) >/dev/null 2>&1 \
      && ok "certificate valid for 14+ more days" || bad "certificate expires within 14 days or cannot be read"
  fi
fi
swh="$(curl -sI -m 15 "$WEB/sw.js")"
grep -qi '^cache-control:.*no-store' <<<"$swh" && ok "sw.js is never cached" || bad "sw.js is cacheable"

# 5. Admin app: login page up, noindex, never cached.
if [ -n "$ADMIN" ]; then
  [ "$(code "$ADMIN/login")" = 200 ] && ok "admin login page: 200" || bad "admin login page is not 200"
  ah="$(curl -sI -m 15 "$ADMIN/login")"
  grep -qi '^x-robots-tag:.*noindex' <<<"$ah" && ok "admin is noindex" || bad "admin is missing noindex"
  c="$(code "$ADMIN/api/units")"
  [[ "$c" == 401 || "$c" == 404 || "$c" == 307 || "$c" == 308 ]] && ok "admin API without a session: $c" || bad "admin API without a session: $c (want 401/404/30x)"
fi

# 6. Staging only: sign up, session, delete, through the web app exactly like a browser.
if [ "${SMOKE_WRITE:-0}" = 1 ]; then
  jar="$(mktemp)"
  email="smoke-$(date -u +%s)-$RANDOM@example.invalid"; pw="Smoke-$(date -u +%s)-pw-$RANDOM"
  c="$(curl -s -o /dev/null -w '%{http_code}' -m 20 -c "$jar" -b "$jar" -X POST -H "Origin: $WEB" -H 'content-type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$pw\",\"locale\":\"fr-CA\"}" "$WEB/api/v1/auth/register")"
  [[ "$c" == 200 || "$c" == 201 ]] && ok "sign up through the web app ($c)" || bad "sign up: $c"
  sess="$(curl -s -m 10 -b "$jar" "$WEB/api/session")"
  [[ "$sess" == *'"parent":true'* ]] && ok "session cookie works" || bad "session after sign up: '${sess:0:100}'"
  c="$(curl -s -o /dev/null -w '%{http_code}' -m 20 -c "$jar" -b "$jar" -X DELETE -H "Origin: $WEB" -H 'content-type: application/json' \
    -d "{\"password\":\"$pw\"}" "$WEB/api/v1/account")"
  [[ "$c" == 204 ]] && ok "delete the throw-away account (204)" || bad "delete account: $c (want 204)"
  rm -f "$jar"
fi

if [ "$FAILS" -gt 0 ]; then echo "SMOKE FAILED: $FAILS check(s)"; exit 1; fi
echo "SMOKE PASSED"
