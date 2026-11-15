# SEC-PERF-001: frontend hardening

Branch `hardening/sec-perf`. Goal: more security and speed, no behavior change.

## Changes
1. Web (pnpm): patch and minor updates. next 16.4.1 to 16.4.6, react and react-dom 19.3.0 to 19.3.1, storybook 10.6.1 to 10.6.7, motion 14.0.0 to 14.14.0, tailwind 4.3.5, zod 4.6.7, tanstack, lucide, next-intl and others. No major version changes.
2. Admin (npm, not part of the pnpm workspace): next 16.4.6, react 19.3.1, tanstack, zustand, zod, tailwind. Lockfile regenerated on Linux (WSL, npm 10). `npm ci` is accepted on Linux and Windows.
3. Headers: `Strict-Transport-Security: max-age=31536000` (no includeSubDomains, no preload) on web (`next.config.ts` self-host, `vercel.ts`) and admin. Admin also gets `Permissions-Policy: camera=(), geolocation=(), payment=(), microphone=(self)`. The microphone stays allowed for the admin voice page.
4. GitHub Actions pinned to commit SHAs with a version comment (checkout, setup-node, setup-go, upload and download-artifact). All tags were lightweight (commit objects).

## Review, no change needed
- CSP, X-Content-Type-Options, Referrer-Policy, frame-ancestors 'none' and X-Frame-Options already present on web and admin.
- Admin session cookie: httpOnly, sameSite strict, secure in production, 8 h, HMAC signed, constant-time compare.
- Admin proxy `/api/[...path]`: fixed upstream base, path segments allowlisted, fixed forwarded headers (no client header passthrough except If-Match), 15 s timeout, auth required.
- `dangerouslySetInnerHTML`: one use, a static theme script (admin layout).
- Secrets: `scripts/secret-scan.sh` is clean, `.env.example` files hold empty values only.
- Known limit (not changed, behavior change): the admin login rate limit keys on `x-forwarded-for`, which a client can spoof unless the reverse proxy overwrites it.
- CSP keeps `'unsafe-inline'` for scripts (ADR 0003, needs nonces). Not changed.

## Audit
| | before | after |
|---|---|---|
| web `pnpm audit` | 9 (2 critical, 3 high, 4 moderate) | 3 (1 high, 2 moderate) |
| admin `npm audit` | 7 moderate | 7 moderate |

Remaining, dev tooling only (not shipped): web zod 3.25.76 under `@vercel/config` (high, needs a zod 3 to 4 jump inside that package), glob and minimatch under storybook docgen. Admin: minimatch under `typescript-eslint` 8.72.2 (latest, no patched release). Majors not taken: vitest 5, eslint 10, typescript 7, @hookform/resolvers 7, @types/node 26.

## Performance
No change. No obvious win found; the only lint hint is a `<img>` in QuestionVisual (left as is, behavior). `js-weight` needs a live API and was not run.

## Test results (baseline and after, same)
- web: `pnpm check` (stories, copy, sounds, art, client IP, env, typecheck, lint) pass, 0 errors; `check-architecture` pass; `test.sh state` and `test.sh contract` ALL GOOD; `pnpm build` pass.
- admin: typecheck, lint (0 errors, 3 pre-existing warnings), voice dsp, `next build` pass.
- Built apps started and loaded: web self-host build `/`, `/api/health`, `/play`, `/parent/login` return 200 with the new headers; admin `/login` 200 with the new headers.
- Not run: suites needing the live Go API (flows, ui, errors, nav, mobile, feed, play, qa) and `admin/scripts/test.sh` smoke.
- Pre-existing: `gen:messages` rewrites `src/i18n/generated/*.json` with different line endings on Windows (reverted, not committed).
