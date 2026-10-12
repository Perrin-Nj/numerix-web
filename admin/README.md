# Numerix Admin

Standalone Next.js 16 app (own `package.json`, own `node_modules`) for the super-admin. Deployed as its own Vercel project, apart from the kid app. French first, EN toggle, light and dark theme.

## Run

```bash
cd admin
npm install
cp .env.example .env.local   # fill the four values
node ../mock/dev.mjs 8083    # platform API (separate terminal)
npm run dev                  # http://localhost:3100
```

Local mock values: `PLATFORM_API_URL=http://localhost:8083`, `ADMIN_API_TOKEN=dev-admin-token`.

## Env vars (server only, none are exposed to the browser)

| Var | Use |
|-----|-----|
| `ADMIN_PASSWORD` | Login password (min 8 chars). |
| `ADMIN_SESSION_SECRET` | HMAC key for the session cookie (min 32 chars). |
| `PLATFORM_API_URL` | Platform base URL. Calls go to `${PLATFORM_API_URL}/admin/v1/*`. |
| `ADMIN_API_TOKEN` | Bearer sent by this app's route handlers to the platform. |

## Tests

```bash
npm run typecheck && npm run lint
npm test                                  # typecheck, lint, build, start app, run smoke (starts ../mock if needed)
ADMIN_URL=http://localhost:3100 ADMIN_PASSWORD=... node scripts/smoke.mjs   # smoke only, one line per check
```

## Deploy (separate Vercel project)

1. New Vercel project, import the repo, set **Root Directory** to `admin`. Framework: Next.js (`vercel.json`).
2. Add the four env vars for Production.
3. On the platform project set `ADMIN_API_TOKEN` to the same value and `ADMIN_ORIGIN` to the admin URL.

## Security notes

- Browser only talks to this app's `/api/*`. The catch-all handler checks the signed cookie (httpOnly, SameSite=Strict, Secure in production, 8 h) and proxies to `/admin/v1/*` with the bearer token. Path segments are whitelisted.
- Pages are guarded by `src/proxy.ts`; unauthenticated users go to `/login`.
- Login is rate limited: 5 failed tries per 10 min per IP, in memory. On serverless this is per instance and resets on cold start; use Redis for strict limits. Add Vercel Firewall rate limiting for defense in depth.
- Password and cookie signature checks use constant-time comparison. No secrets in the repo.
- Security headers: no framing, no sniffing, `noindex`, `no-store`.
- Every child read and every change is audited by the platform (Law 25). The Audit screen lists it.

## Platform contract gaps (applied on the current page only)

The platform has no server filter for: parents by plan, children by grade or activity, audit by text or action. These filters run on the loaded page until the API supports them. The per-parent notification list reads the latest 100 notifications and keeps the ones for that parent. Method toggles: a disabled method is simply removed from the list, at least one must stay.
