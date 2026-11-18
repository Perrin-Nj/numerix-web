# 002 Password reset (web)

Owner decision: no email at all. The Numerix team gives the parent a one-time code after checking who they are.

## Goal
A parent who forgot the password gets back in with one phone call and one short form. The admin never sees or sets a password.

## API contract (contracts/openapi*.yaml, built in numerix-api feat/password-reset)
- Admin POST /admin/v1/parents/{id}/password-reset -> 201 {code, expires_in_seconds: 3600, parent:{id,email}}. Code is 8 digits (shown NNNN-NNNN), 1 hour, single use, burned after 5 wrong tries.
- POST /auth/password/reset {email, code, password} -> 204; 400 reset_code_invalid for every failure; 422 password policy (10 to 128); 429 with Retry-After.
- No forgot endpoint, no email flag, no PARENT_APP_ORIGIN.

## Config
- NEXT_PUBLIC_SUPPORT_EMAIL (web, optional, build time): contact shown on the reset page. Empty: the page says "Contact the team" without an address.

## Screens (parent app)
1. Login: link "Forgot your password?" under the password field, goes to /parent/reset.
2. /parent/reset: two short lines on how it works and the support contact, then one form: email, reset code (numeric keypad, accepts dash and spaces, shown NNNN-NNNN), new password, confirm, show/hide, live 10+ character check.
   - States: form, saving, code invalid (one friendly message), password policy (422), rate limited (calm, with wait), network error, success.
   - Success: "Password changed", button to the login page. No auto login.
   - noindex, no-referrer. Code and passwords live in component memory only, gone on unmount. Reachable signed in or out.
   - Password managers: autocomplete new-password on both fields, email field is the username.

## Admin (parent detail page)
"Reset password" button, confirm step that says what it does, then a dialog: code large as NNNN-NNNN, Copy button, parent email, "valid 1 hour, single use", warning to give it only after verifying the parent (phone, in person) and that 5 wrong tries burn it, audit note. The code is shown once and leaves memory when the dialog closes. Errors toast visibly. fr and en.

## Quality
Storybook story per state (src/features/auth/ResetPasswordForm.stories.tsx). fr-CA (tutoiement like the rest of the parent app) and en-CA copy, no em dashes. 320 to 1280 px, light and dark, keyboard only, aria-live for the counter and status.

## Tests
- Vitest unit (pnpm test:unit): code normalisation and format, password policy, wait minutes.
- Playwright (scripts/qa/password-reset.mjs, local API + parent app + admin app): login link and page meta, admin code, reset, old password fails and new works, code reuse fails, wrong code, 5 wrong tries burn the code and a new code works, short password, mismatch, incomplete code and bad email, 422, 429 (mocked and real API limit), network failure, keyboard only, 320 and 1280 screenshots light and dark, admin dialog (confirm, code, copy, close clears) then parent resets with that code.
- Admin smoke (admin/scripts/smoke.mjs): proxy creates a code.
