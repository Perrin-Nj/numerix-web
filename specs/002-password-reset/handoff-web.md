# Handoff web: password reset (no email, admin issued code)

Branch `feat/password-reset` in worktree C:/nx/pw-web, local commits only, not pushed.

## What shipped
- Parent: login link "Forgot your password?" to `/parent/reset`; one form (email, code, new password, confirm). Components `src/features/auth/ResetPasswordForm.tsx` (stories for form, no support address, saving, code invalid, policy, rate limited with and without wait, network, success), `ResetPasswordScreen.tsx`, pure rules in `reset-logic.ts`, copy in `messages.*.json` (fr-CA, en-CA).
- Hook `useResetPassword`; `ApiError.retryAfterSeconds` from the Retry-After header; the proxy now passes `retry-after` through; `/parent/reset` is open to signed in and signed out visitors (src/proxy.ts).
- Admin: "Reset password" on the parent page, confirm step, one-time code dialog (`admin/src/components/resetcode.tsx`), fr and en messages. It goes through the existing admin proxy; no new env var.
- Contracts: `contracts/openapi.yaml` (`/auth/password/reset`) and `contracts/openapi.admin.yaml` (`/parents/{parentId}/password-reset`), types regenerated with `pnpm gen:api`. Matches specs/002-password-reset/contract-delta.md from the API lane (email maxLength 254, code maxLength 20).

## Config to set
- `NEXT_PUBLIC_SUPPORT_EMAIL` (web, build time, in `.env.example` and config/env/*.env). Empty by default: the page then says to contact the team without an address. SET IT IN PRODUCTION.
- Admin: nothing new. The API needs `ADMIN_API_TOKEN` as before. Deploy the API change first (route must exist).

## Evidence (local stack: API feat/password-reset build, parent app next start, admin app)
- `node scripts/qa/password-reset.mjs` (env WEB, API, ADMIN_URL, ADMIN_TOKEN, ADMIN_PASSWORD): 43 checks, all pass. Screenshots in specs/002-password-reset/evidence (320 and 1280, light and dark, wrong code, rate limit, admin dialog).
- `pnpm test:unit` 6 pass. Storybook vitest for ResetPasswordForm: 9 pass.
- `pnpm check` (stories, copy, sounds, art, ip, env, typecheck, lint) green; `next build` green; admin `tsc`, `eslint` (warnings only, existing), `next build` green.
- Not run: flows, nav, play, ui suites (no shared code changed except proxy route/headers and the AuthForm link). Admin smoke line added, not run against a full admin test.sh.

## Risks
- Rate limit is per IP, 10 attempts per 15 minutes. A school or office sharing one IP could hit the calm 429 message. Retry-After drives the minutes shown.
- Anyone who knows a parent's email can burn a live code with 5 wrong tries (API spec, residual risk). The admin then issues a new one. The wrong-code message says so.
- The code lives only in the admin dialog and the parent's form memory. Browsers may keep typed form values in their own autofill history; the code field uses autocomplete one-time-code.
- fr-CA copy was written by hand; give it one native read.
- Not done on purpose: no email, no forgot page, no auto login after reset. The username hint is the email field itself.
