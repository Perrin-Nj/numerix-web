#!/usr/bin/env bash
# Builds a self-host release of the web app or the admin app: one .tar.gz that "node server.js" runs.
#   bash scripts/release.sh web   <release-id>      -> dist/web.tgz
#   bash scripts/release.sh admin <release-id>      -> dist/admin.tgz
# The web build bakes in API_URL=http://127.0.0.1:8081/v1 (the API lives on the same VM in every environment), so ONE
# build runs unchanged on staging and production. Nothing environment-specific or secret is inside the archive.
set -euo pipefail
cd "$(dirname "$0")/.." || exit 2
APP="${1:?usage: bash scripts/release.sh web|admin <release-id>}"
ID="${2:?release id missing}"
ROOT="$(pwd)"
OUT="$ROOT/dist"
mkdir -p "$OUT"
export NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1

case "$APP" in
  web)
    # same public settings as production.env, but pointing at the local API
    set -a
    # shellcheck disable=SC1090,SC1091
    . <(grep -E '^[A-Z0-9_]+=' config/env/production.env)
    set +a
    export API_URL="http://127.0.0.1:8081/v1"
    pnpm build
    SRC=".next"
    ;;
  admin)
    cd admin
    npm run build
    SRC=".next"
    ;;
  *) echo "first argument must be web or admin" >&2; exit 2 ;;
esac

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE:?}"' EXIT
# Linux keeps pnpm's symlinks; Windows cannot create them without admin rights, so a developer laptop copies real files
cp -r "$SRC/standalone/." "$STAGE/" 2>/dev/null || cp -rL "$SRC/standalone/." "$STAGE/"
mkdir -p "$STAGE/.next" && cp -r "$SRC/static" "$STAGE/.next/static"
[ -d public ] && cp -r public "$STAGE/public"
[ -f "$STAGE/server.js" ] || { echo "no server.js in the standalone output (check outputFileTracingRoot)" >&2; exit 1; }
echo "$ID" > "$STAGE/RELEASE"
tar -czf "$OUT/$APP.tgz" -C "$STAGE" .
( cd "$OUT" && sha256sum "$APP.tgz" )
ls -la "$OUT/$APP.tgz"
