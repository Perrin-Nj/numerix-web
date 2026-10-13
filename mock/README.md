# Numerix mock

Stateless Node mock of the backend, served by `dev.mjs` (local) and `api/mock.mjs` (Vercel). Kid and parent state travels in the `x-mock-state` header (cookie, under 3800 bytes). Static endpoints come from the WireMock mappings (`npm run sync` regenerates them from `contracts/wiremock/gen.mjs`).

Run: `node dev.mjs 8081`. Test: `node scripts/selftest.mjs http://localhost:8081` (one line per check).

## Platform data and stores (V4)

Parents, subscriptions, platform kids, notifications, audit and config are NOT in the cookie. They live in a `PlatformStore` (`lib/platform.mjs`), seeded on first use (40 parents, 70 kids, varied subscriptions).

| Mode | When | Behavior |
|---|---|---|
| memory | default | Seeded, per server instance, resets on cold start. The admin demo works on seeded data only. |
| upstash | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set | JSON values under `nx:platform:*` through the Upstash REST API. The admin toggle reaches the kid app live. |

`GET /__admin/health` reports `platform_store`. Reads and writes replace whole collections (last writer wins), fine for a demo.

## Env vars

| Var | Purpose |
|---|---|
| `ADMIN_API_TOKEN` | Bearer token for `/admin/v1/*`. Dev default `dev-admin-token` only when `NODE_ENV` is not `production`; in production an unset token disables the admin API (503). |
| `ADMIN_ORIGIN` | The only origin allowed by CORS on `/admin/v1/*` (comma separated list accepted). Preflight handled. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Switch to the Redis store. |

## Identity and the session gate

The mock has no parent session, so the app proxy must forward the logged-in parent as header `x-mock-parent-email`. Register and login create a platform Parent (trial for `trial_days`) keyed by the lower-cased email. Without the header the demo parent `parent@example.com` is used. `POST /v1/children/{id}/sessions` returns `402 subscription_inactive` or `403 account_blocked` (a blocked account is refused even under policy `allow`). Feed and other reads stay allowed. Zoe and Max are also platform kids (owned by the demo parent), so admin edits of their settings reach the kid app.

Admin routes bypass `X-Mock-Scenario` injection.
