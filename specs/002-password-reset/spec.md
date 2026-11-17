# 002 Password reset (web)

## Goal
A parent who forgot the password gets back in alone, in under two minutes, on a phone. Support can also hand a link to a parent from the admin app.

## API contract (built in parallel, see contracts/openapi*.yaml)
- POST /auth/password/forgot {email, locale} -> 202 always; 429 rate limited; 422 malformed.
- POST /auth/password/reset {token, password} -> 204; 400 reset_token_invalid; 422 policy (10 to 128); 429.
- Public config `password_reset_email` (false or missing: no email promise, show the contact route).
- Admin POST /admin/v1/parents/{id}/password-reset -> 201 {token, expires_in_seconds, parent}.

## Config
- NEXT_PUBLIC_SUPPORT_EMAIL (web, optional): shown when email reset is off.
- PARENT_APP_ORIGIN (admin, optional in schema, required for the button): builds `${origin}/parent/reset#token=...`.

## Screens (parent app)
1. Login: link "Forgot your password?" under the password field.
2. /parent/forgot: states form, sending, sent, rate limited (with wait), network error (retry), email disabled (contact copy, no form).
   - Sent: same text always. Back to sign in, resend with 30 s cooldown.
3. /parent/reset: token read from the URL fragment, removed at once with history.replaceState, kept in memory. Page is noindex and no-referrer.
   - States: form, submitting, invalid or expired link (button to request a new one), missing token (same screen), policy error inline, mismatch inline, network error with retry, rate limited, success (button to sign in, no auto login).
   - Fields: new password and confirm, show/hide, live check of 10+ characters, autocomplete new-password, hidden username field with the account hint where known.

## Admin
Parent detail: "Reset password" action, confirm step, then a dialog with the link shown once, Copy, expiry (24 h), parent email, warning, audit note. Server route builds the link so PARENT_APP_ORIGIN stays server side. Errors visible.

## Quality
Storybook stories first for every state. fr-CA and en-CA copy, warm, no em dashes. 320 to 1280 px, light and dark, keyboard only, aria-live for status.

## Tests
- Vitest (node): fragment parsing, validation rules.
- Playwright (scripts/qa/password-reset.mjs) against a local API: forgot generic confirmation, admin-made link, reset then login with new password and old fails, link reuse fails, short password, mismatch, expired link, email-disabled copy, 320 and 1280 screenshots.
- Admin smoke: dialog flow.
