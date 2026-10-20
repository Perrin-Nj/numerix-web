# Numerix backend integration guide

One document for the backend team. Read it top to bottom once, then use the section list as a reference. With this guide, `openapi.yaml`, `openapi.admin.yaml` and `BACKEND_REQUIREMENTS.md` a team can build the real backend without asking the frontend team anything. Where the frontend and this guide disagree, section 29 (known mismatches) says which one is wrong.

Last checked against the code on 2026-10-13. Run `bash scripts/test.sh contract` after every change to the frontend or to a contract file: it fails when a frontend call has no operation, when an operation is not described here, and when this guide misses an error code, event, cookie, environment variable or header the code uses.

## 0. How to read this guide

| File | What it is |
|------|-----------|
| `contracts/openapi.yaml` | Kid and parent API, base path `/v1`. Machine readable. Types in `src/data/api/schema.d.ts` are generated from it with `pnpm gen:api`. |
| `contracts/openapi.admin.yaml` | Platform admin API, base path `/admin/v1`. Used only by the admin app. |
| `contracts/BACKEND_REQUIREMENTS.md` | Every backend item (BE and CR), with owner, priority, acceptance test and a link into this guide. |
| `../numerix-api/` | The Go backend. It is the executable reference of behaviour: when a sentence here is unclear, read its handlers and tests. |
| `scripts/flows.mjs` | The tests the backend must pass (section 27). |

Words: **must** is a requirement for launch, **should** is expected unless you explain why not, **may** is optional. Priorities in `BACKEND_REQUIREMENTS.md`: P0 blocks launch, P1 soon after, P2 later.

Names used everywhere: **kid app** (screens under `/play`), **parent app** (screens under `/parent`), **web app** (both, one Next.js project), **admin app** (separate Next.js project in `admin/`), **backend** (what you build), **proxy** (the Next route handler `src/app/api/v1/[...path]/route.ts`).

## 1. Architecture and trust boundaries

```
 Browser (PWA)                 Next.js web app (Vercel, Montreal)             Backend (you build)
 kid and parent screens  --->  /api/v1/*  proxy  ------------------------>   /v1/*   FastAPI target
 cookies only, httpOnly        cookie -> Authorization: Bearer              deterministic engine, planner,
 no tokens in JS               refresh on 401, strip tokens                 mastery, narrator (LLM), DB
                               /api/session, /api/health (app routes)       webhooks from payment processor
                                                                            web push sender (VAPID)
 Admin browser  --->  Admin Next.js app (own Vercel project)  --->  /admin/v1/*  (bearer ADMIN_API_TOKEN)
```

Trust boundaries, in order of importance:

| # | Boundary | Rule |
|---|----------|------|
| B1 | Browser to web app | Same origin only. The browser calls `/api/v1/*` and `/api/session`. Auth lives in httpOnly cookies, so scripts never read a token. The CSP `connect-src` is `'self'`, so the browser cannot call the backend directly. |
| B2 | Web app to backend | Server to server over HTTPS. The proxy turns a cookie into `Authorization: Bearer <token>`. The backend must **not** trust the proxy: it validates every token, role and ownership itself. The backend must not accept cookies or set cookies (bearer only), which removes CSRF from the backend. The backend should be reachable only from the web app egress and the admin app egress (allow list or private network), and must not send CORS headers for the web origin. |
| B3 | Parent token vs child token | Two roles, one signing key set, different `role` claim and audience. A child token can only call the operations that list `child` in `x-roles`. A child token is bound to one `child_id`. |
| B4 | Admin app to platform API | Separate origin, separate secret (`ADMIN_API_TOKEN`), constant time compare, every call audited. The kid and parent origin must never reach `/admin/v1`. |
| B5 | Engine to narrator | The LLM writes text only. The deterministic engine builds the problem, holds the answer, grades, and updates mastery. Narration is never an input to grading. Narrator output is checked for answer leaks before it is stored or streamed (section 13). |
| B6 | Payment processor to backend | Webhooks only, with signature verification and replay protection (section 8). The web app never sees card data. |
| B7 | Backend to push service | VAPID signed Web Push (section 9). |

Data classes: **child data** (first name or nickname, grade, birth year, avatar, progress, answers, time played) and **parent data** (email, password hash, locale, subscription, consent evidence) are personal information under Quebec Law 25 and are treated as sensitive. Children never type free text anywhere in the product (section 21).

## 2. Authentication and sessions

### 2.1 Actors and tokens

| Actor | Gets | How |
|-------|------|-----|
| Parent | access token (JWT, `role=parent`), refresh token (opaque, rotating) | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` |
| Child | access token (JWT, `role=child`, `child_id`), no refresh token | `POST /children/{childId}/token` with the parent's token, plus the child's PIN when the profile has one |
| Admin | none in the kid system | separate admin app login, section 10 |

Browser to web app uses **cookies**. Web app to backend uses **bearer**. A future native client may use bearer directly with the same tokens.

### 2.2 Cookies set by the web app (exact names and flags)

All cookies below are set by the web app, never by the backend. `Secure` is on when `NODE_ENV=production`.

| Cookie | Value | HttpOnly | SameSite | Path | Max-Age | Set by | Purpose |
|--------|-------|----------|----------|------|---------|--------|---------|
| `nx_parent` | parent access token | yes | Lax | `/` | `expires_in` of the auth response | proxy on register, login, refresh, and on a silent refresh | Authorizes parent calls |
| `nx_refresh` | parent refresh token | yes | Lax | `/` | 30 days (2592000), fixed by the proxy | same | Silent renewal |
| `nx_child` | child access token | yes | Lax | `/` | `expires_in` of the child token response | proxy on `POST /children/{childId}/token` | Authorizes kid calls |
| `nx_child_id` | child id (uuid) | **no** (readable by scripts on purpose, it is an id, not a secret) | Lax | `/` | `expires_in` | same | Lets the client know which child is playing via `GET /api/session` |
| `NEXT_LOCALE` | `fr-CA` or `en-CA` | no | Lax | `/` | 1 year | `src/proxy.ts` on first visit (from Accept-Language), and the language switches | Forwarded to the backend as `Accept-Language` |
| `nx_theme`, `nx_motion`, `nx_display` | theme, motion, display mode | no | Lax | `/` | 1 year | theme provider | Server rendering without flash. Not sent to the backend. |
| `nx_admin` | signed admin session (HMAC) | yes | **Strict** | `/` | 8 hours | admin app login | Admin app only. Not part of the kid system. |

Sign out (`DELETE /api/session?scope=all`) clears `nx_parent`, `nx_refresh`, `nx_child`, `nx_child_id`. `scope=child` clears only `nx_child` and `nx_child_id`. The web app does not call the backend on sign out today, so the backend must expire refresh tokens by itself (see section 29, item M5, and `POST /auth/logout`).

### 2.3 What the proxy does and what it expects back

For every browser call to `/api/v1/<path>`:

1. Builds the upstream URL `API_URL/<path>?<same query string>`. `API_URL` already contains `/v1` (default `http://localhost:8081/v1`).
2. Reads header `x-nx-mode` (`parent` default, `child`). It chooses the cookie: mode `child` uses `nx_child`, otherwise `nx_parent`. The mode header is **not** forwarded.
3. Skips the token for `auth/login`, `auth/register`, `auth/refresh`.
4. Forwards only these request headers: `content-type`, `accept`, `idempotency-key`, `last-event-id`, `accept-language` (value of cookie `NEXT_LOCALE`, else the browser header), and `authorization: Bearer <token>`.
5. Sends the request with a 15 second total timeout, `redirect: manual`, no cache. **Consequence:** an SSE response is cut at 15 s, and the backend must never redirect.
6. On `401` for a parent call with a refresh cookie present: calls `POST /auth/refresh {refresh_token}` once. If it answers 200 with `access_token`, `refresh_token`, `expires_in`, the proxy stores the new cookies and replays the original request once. If refresh fails, the original 401 is returned to the browser (cookies are not cleared; the app then shows the "session ended" message with a login action).
7. Child calls never refresh. A `401` on a child call goes straight to the browser.
8. If upstream is unreachable or times out, the proxy answers `502 backend_unreachable` or `504 backend_timeout` itself (problem+json). If upstream answers 502, 503 or 504 with a non-JSON body (HTML from a gateway, empty), the proxy rewrites it to the same two codes. A JSON 5xx from the backend passes through unchanged.
9. Response headers passed back: **only** `content-type` and `cache-control`. `Retry-After`, `ETag`, `X-Request-Id` and everything else are dropped. Put the retry delay in the body (`retry_after_seconds`).
10. For `auth/login`, `auth/register`, `auth/refresh` (status 2xx, JSON): reads `access_token`, `refresh_token`, `expires_in` (default 3600), writes `nx_parent` and `nx_refresh`, **deletes the tokens from the body**, and returns the rest (`expires_in`, `parent`) to the browser.
11. For `children/{id}/token` (2xx JSON): reads `access_token`, `expires_in`, `child.id`, writes `nx_child` and `nx_child_id`, deletes tokens from the body, returns `{expires_in, child}`.
12. `text/event-stream` responses are streamed through with `cache-control: no-cache, no-transform` and `x-accel-buffering: no`.
13. `204` and `202` pass with no body.

The backend must therefore return exactly the `AuthSession` and `ChildToken` shapes of the OpenAPI file, with `access_token` and `refresh_token` as plain strings.

`GET /api/session` (app route, not the backend) returns `{parent: boolean, child: boolean, childId: string|null}` from the cookies. `parent` is true if `nx_parent` or `nx_refresh` exists. Next route guards in `src/proxy.ts` are optimistic only (cookie present); the backend is the real authority.

### 2.4 Parent accounts

- **Register:** `POST /auth/register {email, password, locale}`. Password minimum 10 characters (the form also enforces it). Store with argon2id (or bcrypt cost 12+). Email unique, case-insensitive: duplicate answers `409 email_taken`. Creates a parent in `trial` with `trial_days` from the platform config. Returns 201 and `AuthSession`.
- **Login:** `POST /auth/login {email, password}`. A wrong email or password answers `401 unauthorized` with the same text for both cases (no account enumeration) and the same timing. Rate limit per email and per IP (section 16).
- **Refresh:** `POST /auth/refresh {refresh_token}`. Refresh tokens **rotate**: every successful call returns a new `refresh_token` and the old one becomes invalid. Re-using an old token revokes the whole token family and answers 401. Families expire after 30 days without use.
- **Logout:** `POST /auth/logout {refresh_token?}` revokes the family. Idempotent, always 204. The web app does not call it yet.
- **Parent gate:** the kid area asks a grown-up to type their password before leaving child mode. The web app does it with `POST /auth/login` using the email kept in `localStorage` (`nx:parent-email`) and the typed password. A success replaces the cookies; a failure shows "wrong password". A cheaper dedicated check is requested in CR-7.
- **Email verification, password reset, email change, account deletion:** not in the web app yet. They are required before public launch: BE-34, BE-35, BE-36 in `BACKEND_REQUIREMENTS.md`. Proposed endpoints are in section 3.13.

### 2.5 Child token and PIN

- `POST /children/{childId}/token` is called with the **parent** token (mode `parent`) from the profile picker or from the parent's Play button. The body is `{}` or `{"pin":"1234"}`.
- If `has_pin` is true and the pin is missing or wrong: `403 invalid_pin`. The frontend shows "Ce code ne correspond pas" and keeps the dialog open.
- PIN is exactly 4 digits (`^[0-9]{4}$`). Store hashed (argon2id with a per-child salt). The PIN is **never returned** by any endpoint; only `has_pin`.
- Lock out: 5 wrong PINs for one child within 15 minutes answers `429 rate_limited` with `retry_after_seconds` until the window ends.
- The child token is bound to `child_id`, role `child`, and cannot create other tokens. The child must belong to the parent in the parent token (otherwise `404 not_found`).
- Without consent, the backend should refuse the token with `403 consent_missing` (the profile picker handles that answer; it also checks `consent_given` before asking). Either way `POST /children/{childId}/sessions` must refuse a child without consent.
- **Device model:** the kid door lists profiles with `GET /children`, which needs the parent token. So a family device keeps the parent cookies (`nx_parent`, `nx_refresh`, up to 30 days) and the child cookies side by side. Without a parent session the kid door shows "a grown-up must log in first". Changing player clears only the child cookies.
- The child token carries no refresh token. When it expires the child sees the "session ended" message. Therefore its lifetime must cover a long play session (below).

### 2.6 Consent (Law 25)

- `POST /auth/consent {child_id, version, accepted: true}` with the parent token. `version` is the privacy notice version the parent saw (currently `"2026-10"`, constant in `ConsentScreen`). Answers `204`. Idempotent. A child of another parent answers `404`.
- Store as evidence: parent id, child id, notice version, a hash of the notice text shown, UTC timestamp, source IP network (truncated) and user agent family. Keep the evidence while the child profile exists and for 2 years after deletion (BE-39).
- `Child.consent_given` becomes true. reads of the child profile stay open).
- Revoking consent is done by deleting the child profile (`DELETE /children/{childId}`), which cascades (section 22).

### 2.7 Lifetimes

| Item | Value | Notes |
|------|-------|-------|
| Parent access token | 3600 s (`expires_in`) | Silent refresh covers the rest. Shorter (900 s) is fine. |
| Parent refresh token | 30 days sliding, rotating | Cookie Max-Age is fixed at 30 days by the proxy. |
| Child access token | 28800 s (8 hours) recommended, 3600 s minimum | The cookie Max-Age follows `expires_in`. There is no refresh, so a one hour token ends a long play session. |
| PIN lockout | 5 tries, 15 minutes | |
| Admin session | 8 hours | Admin app only. |
| Idempotency record | 24 hours | Section 5. |

### 2.8 Roles matrix

| Operation family | parent token | child token |
|------------------|:------------:|:-----------:|
| Register, login, refresh, consent, logout | yes (consent, logout need parent) | no |
| Children CRUD, settings write, export, token | yes | no |
| Settings read, child profile read, worlds, journey, home, engagement, collection, growth, reviews, feed, quest, challenges, gift | yes (read) | yes, own child only |
| Start session, beats, answer, narration, pause, resume, finish | no | yes, own child only |
| Session list and get | yes | yes (own) |
| Summary, progress, weekly report | yes | no |
| Subscription, plans, notifications, push | yes | no |
| Platform public, health, ready | public | public |

The `x-roles` field of every operation in `openapi.yaml` is the source of truth. A wrong role answers `403 forbidden`. A resource of another family answers `404 not_found`.

### 2.9 Device sessions and passkeys

BE-64, BE-65, BE-66. Cookies and passkeys are added next to the tokens above; nothing about the bearer tokens changes.

- **Device cookie `nx_device`.** Random 256 bits, only its SHA-256 is stored. `HttpOnly; SameSite=Lax; Path=/; Max-Age=15552000` (180 days), plus `Secure` in every environment except development. Set by register, login and passkey login (the cookie of a known device is rotated, a new device is created otherwise). Rotated on every `POST /auth/device`; an old value answers 401 and is cleared. The Next.js proxy must forward `Cookie` and `Set-Cookie` for `/auth/*`.
- **`POST /auth/device`** (public, no body): response 200 is the same body as `/auth/refresh`; 401 `unauthorized` for a missing, expired, revoked or reused cookie.
- **Kid on a known device.** `ChildSettings.remember_on_device` (default `false`). When `true` and the request to `POST /children/{childId}/token` carries a valid cookie of the same parent, the PIN is not asked. Consent and the daily limit still apply. Otherwise the PIN rules of section 2.5 stay.
- **`GET /account/devices`**: `{ "items": [{ "id", "label", "user_agent_family", "created_at", "last_used_at", "current" }] }`. **`DELETE /account/devices/{deviceId}`**: 204, 404 for a device that is not yours. Logout revokes the current device.
- **Passkeys.** `POST /auth/passkeys/register/begin` (parent token) returns `{ "session_id", "options" }`; give `options` to `navigator.credentials.create` (the library sends `{ "publicKey": ... }`), then send `{ "session_id", "nickname", "credential" }` to `POST /auth/passkeys/register/finish` (201 `Passkey`, 409 `passkey_exists`, 410 `passkey_session_expired`, 422 `passkey_invalid`). Login is `POST /auth/passkeys/login/begin` then `navigator.credentials.get` with no username, then `POST /auth/passkeys/login/finish`, which answers like `/auth/login` and sets the device cookie; any verification failure is 401. A sign counter that does not go up is treated as a cloned key (401). `GET /account/passkeys`, `DELETE /account/passkeys/{passkeyId}` (204 or 404).
- **Config.** `WEBAUTHN_RP_ID` (site domain, no scheme or port), `WEBAUTHN_ORIGINS` (comma separated browser origins, scheme and port included), `WEBAUTHN_RP_NAME`. Defaults outside production: `localhost`, `http://localhost:3000`, `Numerix`. In production unset means passkeys are off (503 `passkeys_unavailable`).

## 3. Endpoint catalogue

Base path `/v1` on the backend. The browser reaches the same paths under `/api/v1`. Every JSON body is UTF-8. Every error is `application/problem+json` (section 4). Every operation can also answer `401 unauthorized` (where a token is required), `403 forbidden`, `429 rate_limited` and `500 internal_error`; these are not repeated below. `Accept-Language` selects the language of every localized string.

How to read an entry: **Caller** is the screen or hook that makes the call. **Status** lists the success and the specific error codes.

### 3.1 Auth

#### `POST /auth/register`
Caller: parent register screen (`AuthForm`, hook `useRegister`). Public.
```json
{ "email": "parent@example.com", "password": "correct-horse-battery", "locale": "fr-CA" }
```
Response 201 (the proxy strips the two tokens before the browser sees it):
```json
{ "access_token": "eyJ...", "refresh_token": "r1...", "expires_in": 3600,
  "parent": { "id": "99999999-9999-4999-8999-999999999999", "email": "parent@example.com", "locale": "fr-CA" } }
```
Status: 201; 409 `email_taken`; 422 `validation_failed` (bad email, password under 10 characters, locale not `fr-CA` or `en-CA`); 429.

#### `POST /auth/login`
Caller: parent login (`AuthForm`, `useLogin`) and the parent gate (`ParentGate`). Public.
```json
{ "email": "parent@example.com", "password": "correct-horse-battery" }
```
Response 200: same body as register. Status: 200; 401 `unauthorized`; 429.

#### `POST /auth/refresh`
Caller: the proxy only, on a 401. Public (the refresh token is the credential).
```json
{ "refresh_token": "r1..." }
```
Response 200: same body as login, with a **new** refresh token. Status: 200; 401 `unauthorized` (unknown, expired or reused token).

#### `POST /auth/logout`
Caller: none yet. Parent token or refresh token in the body.
```json
{ "refresh_token": "r1..." }
```
Response 204 always. Revokes the token family.

#### `GET /account`
Caller: none yet. Parent token. Response 200: `{ "id": "9999...", "email": "parent@example.com", "name": "Camille Demo", "locale": "fr-CA", "email_verified": true, "created_at": "2026-09-12T14:00:00Z" }`.

#### `PATCH /account`
Caller: none yet; the parent account screen should call it when the language changes (today it sets a cookie only, M23). Parent token. Body `{ "name": "Camille", "locale": "en-CA" }`, both optional. Response 200: the account. The locale decides the text of notifications and emails created afterwards. Status: 200; 422.

#### `DELETE /account`
Caller: none yet (account deletion, BE-36). Parent token. Body `{ "password": "..." }`. Response 204. Cascade in section 22.4. Status: 204; 401 `unauthorized` (wrong password); 429.

#### `POST /auth/consent`
Caller: consent screen `/parent/children/[id]/consent` (`useConsent`). Parent token.
```json
{ "child_id": "11111111-1111-4111-8111-111111111111", "version": "2026-10", "accepted": true }
```
Response 204. Status: 204; 404 `not_found` (child not yours); 422 (`accepted` not true).

### 3.2 Children

The `Child` object:
```json
{ "id": "11111111-1111-4111-8111-111111111111", "display_name": "Zoé", "birth_year": 2018, "grade": 3,
  "avatar_id": "fox", "has_pin": true, "consent_given": true, "favorite_world": "echecs",
  "timezone": "America/Toronto", "onboarding_completed": false, "created_at": "2026-10-12T14:00:00Z" }
```
`display_name` is a first name or nickname, 1 to 30 characters. `birth_year` is derived from grade when not given (`current year - (grade + 5)`). `favorite_world` is the world of the child's last started chapter, null before.

#### `GET /children`
Caller: parent home `/parent`, kid profile picker `/play`, parent settings (`useChildren`). Parent token.
Response 200: `{ "items": [Child, ...] }`. Not paginated (a parent has at most 8 profiles). Status: 200.

#### `POST /children`
Caller: new child form `/parent/children/new` (`useCreateChild`). Parent token.
```json
{ "display_name": "Nora", "grade": 3, "avatar_id": "owl", "pin": "4321", "timezone": "America/Toronto" }
```
`pin` and `timezone` are optional. `timezone` is the IANA zone of the browser (the form sends it); default `America/Toronto`. `avatar_id` is a short id from the avatar set (CR-3 asks for a catalogue; today the ids are `fox, owl, bear, cat, panda, rabbit, lion, turtle` and the face is drawn locally from the id).
Response 201: `Child` with `consent_given: false`, `has_pin: true` when a pin was sent.
Status: 201; 422 `validation_failed` (name empty or over 30, grade outside 1 to 4, pin not 4 digits, ninth profile: a parent holds at most 8). Body fields `grade` is 1 to 4 (Quebec primary years covered today).

#### `GET /children/{childId}`
Caller: none today (profile data comes from the list). Parent or child token (own).
Response 200: `Child`. Status: 200; 404.

#### `PATCH /children/{childId}`

Caller: child settings screen (`useUpdateChild`), onboarding flag. Parent token.
```json
{ "display_name": "Zoé B", "grade": 4, "avatar_id": "owl", "onboarding_completed": true, "timezone": "America/Montreal", "pin": null }
```
All fields optional. `pin: null` removes the PIN, a 4 digit string sets it. `timezone` is an IANA zone; it moves the day boundary from the next day on. The parent account screen can replay the guided tour; with the server in charge that is `onboarding_completed: false`. Response 200: `Child`. Status: 200; 404; 422.

#### `DELETE /children/{childId}`
Caller: settings screen, after the parent types the first name (`useDeleteChild`). Parent token.
Response 204. Irreversible cascade, section 22. Status: 204; 404.

#### `POST /children/{childId}/token`
Caller: profile picker `/play` (PIN dialog), parent Play button (`PlayAsButton`), via `useChildToken`. Parent token.
```json
{ "pin": "1234" }
```
Response 200 (tokens stripped by the proxy):
```json
{ "access_token": "eyJ...", "expires_in": 28800, "child": { "id": "11111111-...", "display_name": "Zoé", "grade": 3, "avatar_id": "fox", "has_pin": true, "consent_given": true } }
```
Status: 200; 403 `invalid_pin` or `consent_missing`; 404; 429 (PIN lockout).

#### `GET /children/{childId}/settings`
Caller: kid shell (read aloud, sound, language switch flag), Me screen, home (daily limit for reminders), parent settings. Parent or child token.
Response 200:
```json
{ "daily_goal_chapters": 1, "daily_time_limit_minutes": null,
  "enabled_worlds": ["nature","espace","cuisine","sport","construction","medecine","science","echecs"],
  "read_aloud": true, "sound": true, "kid_can_change_language": true }
```
Defaults are exactly those. Status: 200; 404.

#### `PUT /children/{childId}/settings`
Caller: parent settings screen (`useUpdateSettings`). Parent token. Replaces the whole object.
Body: same shape. Limits: `daily_goal_chapters` integer 1 to 5; `daily_time_limit_minutes` null or integer 5 to 180; `enabled_worlds` non-empty list of world ids; `read_aloud`, `sound`, `kid_can_change_language` booleans (missing `kid_can_change_language` means true).
Response 200: the saved object. Status: 200; 404; 422.
The admin app can also change `daily_time_limit_minutes` and `kid_can_change_language`; the kid app must see the admin change on its next read (BE-28).

#### `GET /children/{childId}/export`
Caller: parent settings "Exporter les données" (`exportChild`). Parent token.
Response 200: a JSON document with everything held about the child (format in section 22.3). The web app saves it as a file. Audited as `child.export`.
Status: 200; 404.

### 3.3 Catalog

#### `GET /worlds`
Caller: worlds screen `/play/worlds`, journey screen (`useWorlds`; cached 10 minutes). Parent or child token.
Response 200:
```json
{ "items": [ { "id": "nature", "name": "Nature", "tagline": "Nature", "image_url": "", "accent_color": "#3FA34D", "hook": "Explore la forêt et ses secrets", "skill_count": 41 } ] }
```
Eight worlds, always in this order: `nature, espace, cuisine, sport, construction, medecine, science, echecs`. `image_url` is empty until real art exists (the app draws placeholder art); when set it must be on a host listed in `IMAGE_HOSTS`. `hook` is one teaser line in the request language.

#### `GET /skills`
Caller: none today (reserved for the parent curriculum view). Parent token. Query `world`, `grade` (1 to 4), `implemented` (boolean).
Response 200: `{ "items": [ Skill ] }` with `id`, `label`, `ref_pda`, `section`, `grade_intro`, `grade_mastery`, `cycle`, `prerequisites[]`, `worlds[]`, `implemented`. 75 skills in the curriculum;

### 3.4 Journey, home, engagement, progress

#### `GET /children/{childId}/journey`
Caller: journey screen `/play/journey/[world]` (`useJourney`, query `world` required). Parent or child token.
```json
{ "world": "echecs", "current_skill_id": "ARI-OPE-A05",
  "nodes": [ { "skill_id": "ARI-OPE-A02a", "label": "Additions rapides", "state": "mastered", "position": { "row": 0, "col": 2 }, "level": 3, "next_review_at": null } ] }
```
Rules: one node per skill, ordered; `position.row` is the index in the path and `col` 0 to 4 zigzags (the layout is data, the app draws a winding path). `state`: `locked | available | in_progress | mastered | needs_review`. `locked_reason` (`prerequisites | grade`) is present only when `state` is `locked`: `grade` means the quest has fewer than 8 published questions that the child's school year can be served, so it is shown locked and never offered (starting it answers 422 on `skill_id`; the planner never picks it). `level` 0 to 5 is shine on the node (0 new), never a score. `current_skill_id` is the planner's suggestion for the big Play button (first `needs_review`, else first `in_progress`, else first `available`, else the last node). A step completed (chapter finished at or above the card threshold) opens the next; **at least two steps beyond the completed ones are always playable** (`READY_AHEAD = 2` in `rules.ts`). Status: 200; 404; 422 (unknown world).

#### `GET /children/{childId}/home`
Child token.
```json
{ "suggested": { "world": "echecs", "skill_id": "ARI-OPE-A06a", "label": "Les tables", "open_session": null },
  "quest": { "available": true, "completed": false, "skill_ids": ["ARI-OPE-A06a"] },
  "worlds": [ World, ... ],
  "recent_cards": [ StoryCard, ... ],
  "engagement": { "streak": { "current_days": 3, "longest_days": 5, "last_active_date": "2026-10-11" }, "daily_goal": { "target_chapters": 1, "done_chapters": 0 } },
  "growth": { "window_days": 7, "current": { "chapters_completed": 4, "skills_mastered": 2, "minutes_played": 48 }, "previous": { "chapters_completed": 2, "skills_mastered": 1, "minutes_played": 25 } },
  "gift_available": true, "active_challenges": 5 }
```
One aggregate so the landing screen needs one request. `suggested.world` is the world of the last started chapter (default `nature`). `open_session` is the unfinished session, else null. `recent_cards` holds the 4 newest cards. `gift_available` and `active_challenges` are new (BE-20). Status: 200; 404.

#### `GET /children/{childId}/engagement`
Caller: Me screen, done screen (`useEngagement`). Parent or child token. Response: the `engagement` object above plus `minutes_today` (active play minutes today in the child's time zone) and `last_played_at` (end of the last chapter, or null). The kid home needs those two for the time-limit and play reminders; today it derives them from the device log, which is empty in api mode (M21). Rules in section 14.

#### `GET /children/{childId}/quests/daily`
Caller: quest screen `/play/quest` (`useDailyQuest`). Child token.
Response 200: `{ "available": true, "completed": false, "skill_ids": ["ARI-OPE-A06a"] }`. `skill_ids` are the due reviews of the child (skills in `needs_review`), else the current skill. `completed` is true once a `daily_quest` session finished today in the child's time zone. `available` is false only when there is nothing to review and nothing to learn.

#### `GET /children/{childId}/collection`
Caller: collection screen `/play/collection` (`useCollection`, infinite query but no cursor today). Parent or child token. Optional query `world`.
Response 200: `{ "items": [ { "id": "5555...", "world": "echecs", "title": "Le tournoi des tours", "image_url": "", "session_id": "3333...", "earned_at": "2026-10-12T14:00:00Z" } ] }`. Newest first. The contract allows `next_cursor`; add it when a child can own more than 100 cards (section 6). Titles are in the request language at the time of reading (store both languages).

#### `GET /children/{childId}/growth`
Caller: Me screen, parent overview (`useGrowth`). Parent or child token. Query `window_days` 7 (default) or 30.
Response: `{ window_days, current: {chapters_completed, skills_mastered, minutes_played}, previous: {...} }`. The child compared with their own past only; never ranks against other children. Definitions in section 14.

#### `GET /children/{childId}/reviews`
Caller: none today. Parent or child token. Query `days` 1 to 90 (default 30). Response: `{ "items": [ { "skill_id": "ARI-OPE-A05", "label": "Le terme manquant", "due_at": "2026-10-12T18:00:00Z" } ] }`, soonest first.

#### `GET /children/{childId}/progress`
Caller: parent overview `/parent/children/[id]` (`useProgress`). Parent token.
```json
{ "skills": [ { "skill_id": "ARI-OPE-A02a", "mastery": 0.95, "state": "mastered", "attempts": 12, "last_practiced_at": "2026-10-12T14:00:00Z", "next_review_at": null } ],
  "misconceptions": [ { "code": "reste_ignore", "description": "Ignore le reste dans une division", "skill_ids": ["ARI-OPE-A07a"] } ] }
```
`mastery` is 0 to 1, decays with idle time. `misconceptions` are the codes seen in the last 30 days (section 13).

#### `GET /reports/weekly`
Caller: parent report `/parent/children/[id]/report` (`useWeeklyReport`, query `child_id` required). Optional `week_start` (a Monday, `YYYY-MM-DD`, in the child's time zone; default the last full week). Parent token.
```json
{ "child_id": "1111...", "week_start": "2026-10-05", "sessions": 4, "days_played": 3, "skills_practised": ["ARI-OPE-A06a"],
  "stuck_points": [ { "code": "reste_ignore", "description": "Ignore le reste dans une division", "skill_ids": ["ARI-OPE-A07a"] } ],
  "growth": { "window_days": 7, "current": {...}, "previous": {...} } }
```
Status: 200; 404; 422.

### 3.5 Sessions (the chapter loop)

A session is one chapter: 3 beats (`chapter_length = 3`). Each beat is a scene (LLM text), a question with 4 choices (engine), and after the answer a denouement (LLM text). Child token for everything below except summary.

The `Session` object:
```json
{ "id": "3333...", "child_id": "1111...", "world": "echecs", "kind": "chapter", "status": "active", "chapter_length": 3,
  "beats_answered": 1, "current_beat": Beat | null, "story_title": "Le tournoi des tours",
  "started_at": "2026-10-12T14:00:00Z", "ended_at": null, "score": Score? }
```
`kind`: `chapter | daily_quest | onboarding`. `status`: `active | paused | completed | abandoned`. `score` is required inside `AnswerResult.session` and `SessionSummary.session`, and recommended on every session once one beat is answered, because the done screen keeps the rewards in `sessionStorage` only and loses them on reload (M22). Rules in section 14.

#### `POST /children/{childId}/sessions`
Caller: every Play button: home, journey, worlds, quest, feed call to action, done screen "next chapter" (`useStartChapter`, `useStartSession`). Child token. Header `Idempotency-Key` (uuid) required.
```json
{ "world": "echecs", "kind": "chapter", "skill_id": "ARI-OPE-A06a" }
```
`skill_id` is optional or null (the planner chooses). An unknown skill, or a chapter the child's grade has fewer than 8 playable questions for, answers 422 on `skill_id`. `kind: onboarding` uses fixed easy problems and is not counted in mastery (BE-12). Response 201: `Session` with `beats_answered: 0`, `current_beat: null`, `story_title` set.
Status: 201; 402 `subscription_inactive`; 403 `consent_missing` | `daily_limit_reached` | `account_blocked`; 409 `session_active`; 422 `validation_failed` (unknown world).
Order of checks (first failure wins): auth, ownership, `account_blocked`, `subscription_inactive`, `consent_missing`, `daily_limit_reached`, `session_active`, validation. The 402 and 403 bodies carry `i18n` copy in both languages (section 4).

#### `GET /children/{childId}/sessions`
Caller: parent overview "dernières histoires" (`useSessionList`). Parent or child token. Query `limit` (1 to 100, default 20), `cursor`.
Response 200: `{ "items": [Session, ...], "next_cursor": null }` newest first. Status: 200; 404.

#### `GET /sessions/{sessionId}`
Caller: story screen on load and after reload; done screen (`getSession`). Parent or child token.
Response 200: `Session` with `current_beat` set when a question is open. Resuming a `paused` session is done by the client with `/resume`. Status: 200; 404.

#### `POST /sessions/{sessionId}/beats`
Caller: story screen, when it needs the next question (`requestBeat`). Child token. Header `Idempotency-Key` required.
No body. Response **201** with a new `Beat`, or **200** with the same still-unanswered beat (calling again before answering never creates a second beat).
```json
{ "id": "4444...", "session_id": "3333...", "index": 0, "skill_id": "ARI-OPE-A06a",
  "question": { "math_text": "6 × 7 = ?", "choices": [42, 13, 48, 36] },
  "scene": { "status": "pending", "text": null, "illustration_url": null }, "created_at": "2026-10-12T14:00:00Z" }
```
The beat **never** contains the answer, the outcome, or which choice is the misconception (BE-01). `choices` has exactly 4 distinct values. A division with remainder uses pairs `[quotient, remainder]`. Status: 201; 200; 404; 409 `session_completed` | `session_paused`.

#### `POST /sessions/{sessionId}/beats/{beatId}/answer`
Caller: story screen when the child taps a choice (`sendAnswer`). Child token. Header `Idempotency-Key` required (the app generates one key per tap and reuses it on retry).
```json
{ "answer": 42, "response_time_ms": 4200 }
```
`response_time_ms` is optional (the app does not send it today; mastery only, never shown). Response 200:
```json
{ "outcome": "correct", "correct_answer": 42, "denouement": { "status": "pending", "text": null, "illustration_url": null },
  "session": { "...": "Session with score", "status": "completed", "beats_answered": 3, "score": { "correct": 3, "total": 3, "pct": 100, "threshold_pct": 70, "card_awarded": true } },
  "rewards": [ { "type": "chapter_complete" },
               { "type": "card_earned", "card": { "id": "5555...", "world": "echecs", "title": "Le tournoi des tours", "image_url": "", "session_id": "3333...", "earned_at": "2026-10-12T14:00:00Z" } },
               { "type": "skill_mastered", "skill_id": "ARI-OPE-A06a" } ] }
```
`outcome` is `correct | erreur_typique | erreur_aleatoire` (section 13). `correct_answer` is returned for every outcome so the app can show it kindly; the app never renders red or a failure state. `rewards` is empty until the last beat. Types: `chapter_complete`, `card_earned`, `skill_mastered`, `streak_extended`, `daily_goal_met` (rules in section 14).
Status: 200; 404 (unknown beat); 409 `beat_answered`; 422.

#### `GET /sessions/{sessionId}/beats/{beatId}/narration`
Caller: story screen, once per phase (`streamNarration`). Child token. Query `phase=scene|denouement` (required). Response `text/event-stream`, protocol in section 7. Status: 200; 404; 409 `beat_not_answered` (denouement before the answer) or `session_completed`.

#### `POST /sessions/{sessionId}/pause`
Caller: the quiet pause button on the story screen (`pauseSession`). Child token. No body. Response 200: `Session` with `status: paused`. No penalty, no timer.

#### `POST /sessions/{sessionId}/resume`
Caller: story screen on load when the session is paused (`resumeSession`). Child token. Response 200: `Session` with `status: active` and `current_beat` (the open question, if any). A completed session stays completed.

#### `POST /sessions/{sessionId}/finish`
Caller: exit-the-chapter confirmation on the story screen (`finishSession`). Child token. Response 200: `Session` with `status: completed`. If fewer than all beats were answered the session is `abandoned` in history and the local state records `finish done:false`; the contract returns `completed` today, and the backend should answer `abandoned` when `beats_answered < chapter_length` (BE-21). An abandoned chapter earns no card and does not advance the journey.

#### `GET /sessions/{sessionId}/summary`
Caller: parent recap `/parent/children/[id]/sessions/[sid]` (`useSessionSummary`). Parent token.
```json
{ "session": { "...": "Session with score" }, "duration_seconds": 540,
  "story_recap": "Zoé et Pip ont vécu « Le tournoi des tours » sur l’échiquier. 2 sur 3 du premier coup.",
  "skills": [ { "skill_id": "ARI-OPE-A06a", "label": "Les tables", "reason": "nouvelle", "attempts": 3, "correct": 2 } ],
  "stuck_points": [ { "code": "addition_au_lieu_multiplication", "description": "Additionne les deux nombres au lieu de les multiplier", "skill_ids": ["ARI-OPE-A06a"] } ] }
```
`reason`: `revision | consolidation | nouvelle | entretien`. `stuck_points` lists the misconception of every `erreur_typique` in the session. `duration_seconds` is active play time (pauses excluded), minimum 30. `story_recap` is in the request language and contains only the first name. Fallback beats must be marked (CR-6). Status: 200; 404.

### 3.6 Discovery feed

Child token. `NEXT_PUBLIC_FEATURE_FEED` hides the tab; the endpoints still exist. All content is generated by Numerix, never by users. Every item is labelled AI generated in the UI.

#### `GET /children/{childId}/feed`
Caller: feed screen `/play/feed` (`useFeed`, infinite query, page size 5). Query `cursor`, `limit` (1 to 20, default 5).
```json
{ "items": [ { "id": "feed-0", "kind": "story_short", "world": "nature", "title": "La porte à chiffres", "text": "Un petit renard trouve une porte...",

               "puzzle": null, "cta": { "label": "Jouer dans Nature", "world": "nature", "skill_id": "ARI-OPE-A06a" } } ],
  "next_cursor": "i5" }
```
`kind`: `story_short | fun_fact | puzzle | challenge`. A puzzle item has `puzzle: {math_text, choices[4]}` and never its answer. `next_cursor` is always set (the feed never ends). Items must not repeat within 40 consecutive items. Text lengths: story 35 to 60 words, fact 20 to 40, challenge 15 to 30. The first name of the child may appear in text; no other personal data. Status: 200; 403 `consent_missing`; 404.

#### `GET /children/{childId}/discover`
Caller: feed screen `/play/feed` (`useDiscover`, infinite query, page size 12). Query `cursor` (opaque), `limit` (1 to 12, default 12). Child token. 422 for a cursor the server did not issue for this child.
```json
{ "items": [ { "id": "m-honeycomb", "kind": "photo", "liked": false, "saved": false,
    "media": { "id": "honeycomb", "media_kind": "photo", "title": "Un rayon de miel", "caption": "Les alvéoles...", "alt": "...",
      "question": { "prompt": "...", "answer": "..." }, "world": "nature", "topic": "shapes", "grade_min": 2,
      "src": "/feed-media/honeycomb-9d6893db.webp", "src_small": "/feed-media/honeycomb-s-3fe3c0ba.webp", "width": 960, "height": 720, "lqip": "data:image/webp;base64,...",
      "source_url": "https://...", "creator": "...", "licence": "CC0 1.0", "attribution": "..." } },
  { "id": "feed-2", "kind": "puzzle", "liked": false, "saved": false, "puzzle_item": { "...a FeedItem..." } } ],
  "next_cursor": "NzguM2E...", "cycle": 0, "cycle_size": 200 }
```
200 curated items (110 photos, 40 animations, 50 videos), texts in the request language, never generated, never user made. The order is a private shuffle per child: every eligible item (`grade_min <= grade + 1`) is shown once before any repeat, then a new shuffle (`cycle` + 1). Never more than two videos in a row; every 8th slot is a puzzle (a regular feed item: like, save and answer use the feed operations). Videos carry `captions[]` (fr-CA and en-CA WebVTT) and `poster`; `has_audio` is true for 3 clips and they start muted. Media URLs are relative (`MEDIA_BASE_URL`, default `/feed-media`); Next rewrites them to the API. Likes and saves use `PUT .../feed/m-<id>/reaction` (unknown `m-` ids are 404). No outbound link: `source_url` is data for the credits, not a link in the child area. Details: numerix-api/docs/FEED_MEDIA.md.

#### `GET /feed-media/{file}`
Public (the file name is a content hash, the files are curated and contain no one's data). Photos (webp), clips (mp4), captions (vtt). `ETag`, `Cache-Control: public, max-age=31536000, immutable`, `Accept-Ranges: bytes`; `If-None-Match` gives 304; `Range` gives 206 (416 when out of range) so a video starts before it is loaded. Same-origin through the Next rewrite `/feed-media/*`.

#### `PUT /children/{childId}/feed/{itemId}/reaction`
Caller: like and save buttons (`reactToFeedItem`). Body `{ "liked": true, "saved": false }`, response 200 with the stored state. Private to the child. Both false deletes the record. Idempotent. If this like completed a challenge (`feed_fan`), the response also carries `rewards: [{type: card_earned, card}]` so the app can celebrate at once (the local state does it from its queue).

#### `POST /children/{childId}/feed/{itemId}/answer`
Caller: puzzle card (`answerFeedPuzzle`). Body `{ "answer": 42 }`. Response 200 `{ "outcome": "erreur_typique", "message": "La porte vacille et un petit chemin apparaît..." }` where `message` is a short story line in the request language, never a score. Graded by the engine. A correct answer that completes `puzzle_pro` adds `rewards: [{type: card_earned, card}]`. Status: 200; 404 (item is not a puzzle).

### 3.7 Challenges and gift (BE-20)

Child token. Catalogue and metrics in section 14.

#### `GET /children/{childId}/challenges`
Caller: challenges screen `/play/challenges`, home badge, parent overview (`useChallenges`).
```json
{ "items": [ { "id": "sharp_three", "title": "Triplé gagnant", "description": "Réponds juste 3 fois de suite.", "target": 3, "progress": 1,
               "status": "active", "reward_label": "Une carte rare", "emoji": "🎯", "accepted_at": "2026-10-12T14:00:00Z", "card": null } ] }
```
Sorted active, available, done. The web app maps `reward_label` to its `rewardLabel` view field.

#### `POST /children/{childId}/challenges/{challengeId}/accept`
Caller: challenge card Accept button. No body. Response 200: the `Challenge`. Idempotent: a second call keeps the first `accepted_at`. Status: 200; 404 (unknown challenge).

#### `POST /children/{childId}/gift/claim`
Caller: welcome gift overlay on home (`claimGift`). No body. Response 201 with the `StoryCard` `welcome` the first time, 200 with the same card afterwards. The overlay's "Plus tard" button calls nothing (remembered for the session only).

### 3.8 Subscription, notifications, platform, push

Parent token unless noted.

#### `GET /subscription`
Caller: subscription pill in the parent header and menu, subscription screen, settings (`useSubscription`).
```json
{ "status": "trial", "plan": "free", "trial_ends_at": "2026-10-26T14:00:00Z", "can_play": true, "days_left": 14 }
```
Effective status rules and the state machine are in section 8. Status: 200.

#### `GET /subscription/plans`
Caller: subscription screen (`usePlans`).
```json
{ "currency": "CAD",
  "plans": [ { "id": "family_monthly", "price_cad_cents": 899, "period": "month", "name": { "fr": "Famille mensuel", "en": "Family monthly" },
               "features": { "fr": ["Jusqu’à 8 profils enfants"], "en": ["Up to 8 child profiles"] } } ],
  "methods": [ { "id": "card", "label": { "fr": "Carte de crédit", "en": "Credit card" } } ] }
```
Prices are integer cents of CAD. Plans: `free` (0, period `none`), `family_monthly` (899, `month`), `family_yearly` (8990, `year`). Methods: `card, interac, paypal, apple_pay, google_pay`. **The web app currently reads this wrongly (known mismatch M1); the contract above is the truth.**

#### `POST /subscription/checkout`
Caller: subscription screen Subscribe button (`useCheckout`).
```json
{ "plan": "family_monthly", "method": "card" }
```

Processor response 200: the current subscription plus `"checkout_url": "https://checkout.processor.com/c/cs_123"`. The app navigates the browser to it only when it starts with `https://`; the subscription changes only after the webhook (section 8).
Status: 200; 409 `conflict` (already on that paid plan); 422 `validation_failed` (free plan, unknown method).

#### `POST /subscription/cancel`
Caller: subscription screen, confirm dialog (`useCancelSubscription`). No body. Response 200: the subscription with `status: canceled` and `renews_at` unchanged (access continues to the end of the period). Status: 200 (also when already canceled); 409 `not_cancelable` (unpaid, expired).

#### `GET /notifications`
Caller: the bell in the parent header (`useServerNotifications`), polled every 60 s while the tab is visible. Query `audience` (`parent` default, `child`).
```json
{ "items": [ { "id": "nt-1", "kind": "payment_due", "title": "Paiement requis", "body": "Réglez votre abonnement pour que votre enfant puisse rejouer.", "created_at": "2026-10-12T14:00:00Z", "read": false, "audience": "parent" } ], "unread_count": 1 }
```
Newest first, up to 100 items (add `cursor` pagination past that). Kinds: `play_reminder, time_limit, subscription_expiring, payment_due, announcement`. Title and body are rendered in the parent's locale at creation time. The backend creates `payment_due` and `subscription_expiring` automatically, once per period (section 9).

#### `POST /notifications/{notificationId}/read`
Caller: tapping a notification (`useMarkNotificationRead`). Response 204. Idempotent. Status: 204; 404.

#### `GET /platform/public`
Caller: parent app for the paywall text and reminders (`usePlatformPublic`, cached 5 minutes). **Public**, no token.
```json
{ "unpaid_policy": "block", "card_threshold_pct": 70, "trial_days": 14, "default_locale": "fr-CA",
  "expiring_warning_days": 7, "reminder_hour_local": 17, "daily_time_limit_minutes_default": 60,
  "features": { "feed": true, "challenges": true, "push": false, "payments": true } }
```

#### `POST /push/subscribe`
Caller: "Enable notifications" prompt (`subscribeToPush`, then `postPushSubscription`). Parent token. Body is the browser `PushSubscription.toJSON()`:
```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/abc", "expirationTime": null, "keys": { "p256dh": "BNc...", "auth": "xyz..." } }
```
Response 201 stored, 204 already stored. The app maps 404, 405 and 501 to "not available yet" and any other failure to a generic retry message. Details in section 9.

#### `DELETE /push/subscribe`
Caller: none yet. Body `{ "endpoint": "..." }`. Response 204 always.

### 3.9 Ops

#### `GET /health`
Caller: the web app's `GET /api/health` (used by the error classifier). Public.
```json
{ "status": "ok", "narrator": "llm", "version": "1.4.2" }
```
`status`: `ok | degraded`. `narrator`: `llm | stub | down`. Must answer in under 300 ms with no database call. Any non-2xx or timeout means "backend unreachable" for the app.

#### `GET /ready`
Caller: load balancer. Public. `{ "status": "ok", "checks": { "database": "ok", "cache": "ok", "engine": "ok", "narrator": "ok" } }` or `503` with the failing checks.

#### `POST /events`
Caller: none yet (analytics). Child or parent token. Body `{ "events": [ { "name": "world_picker_opened", "at": "2026-10-12T14:00:00Z", "props": { "world": "nature" } } ] }` with at most 100 events. Response 202. Drop unknown names, never store free text or names.

### 3.10 App owned routes (not the backend)

These are Next.js route handlers in the web app. The backend does not implement them; they are listed because the frontend calls them.

| Route | Caller | Behaviour |
|-------|--------|-----------|
| `GET /api/session` | `useSessionStatus` on almost every screen | Returns `{parent, child, childId}` from cookies. `Cache-Control: no-store`. |
| `DELETE /api/session?scope=child\|all` | sign out, "change player" (`signOut`) | Clears cookies (section 2.2), answers 204. |
| `GET /api/health` | the error classifier after a failed request | Calls `GET {API_URL}/health` with a 3 s timeout and returns `{app:"ok", backend:"ok"\|"timeout"\|"unreachable"\|"error", host}`. |

### 3.11 Admin endpoints

Listed in full in section 10 with the exact operations of `openapi.admin.yaml`.

### 3.12 Webhooks the backend receives

`POST /webhooks/payments` from the processor. Not part of the web app contract; specified in section 8.4.

### 3.13 Proposed endpoints not in the OpenAPI files yet

These are needed before launch (see the BE items) and are only sketched so teams can plan.

| Endpoint | Item | Sketch |
|----------|------|--------|
| `POST /auth/verify-email {token}` and `POST /auth/resend-verification` | BE-34 | Email link with a signed token valid 24 h. Unverified parents can use the app for 7 days; checkout requires a verified email. |
| `POST /auth/password/forgot {email}` (always 202) and `POST /auth/password/reset {token, password}` | BE-35 | Token valid 1 h, single use, revokes all refresh families. |
| `POST /auth/password/check {password}` | CR-7 | 204 or 403 `invalid_credentials` for the parent gate, rate limited, does not rotate tokens. |
| `GET /account/export` | BE-37 | Parent level export (same format as the child export, one document per child plus the account and subscription history). |

### 3.14 Question bank, pictures, credits and hints

How the kid app uses the question bank. Question kinds and their answers are in the `Question` and `AnswerValue` schemas; the web screens are described in `docs/PLAY_UX.md`.

- `GET /assets/{file}` (public): a picture. The app asks `/assets/a_<id>-<w>.webp` and Next rewrites it to `<API>/assets/...`, so the browser and the CDN see `Cache-Control: public, max-age=31536000, immutable` and the strong `ETag` (304 on `If-None-Match`). Unknown or unapproved files are 404.
- `GET /credits` (public): attributions of the images in use, printed on the `/credits` page of the web app (also linked from the child's Me screen).
- `POST /sessions/{sessionId}/beats/{beatId}/hint`: the written hint of a curated question. 404 when `hint_available` is false, 409 `beat_answered` after the answer. The app asks for it only when the child taps "Give me a hint".
- A beat of a curated question is `ready` at once; `question.media[]` holds `scene` and `object` pictures (`MediaRef`: `lqip`, `color`, `srcset`). The app shows `lqip` and `color` first, then the sharp file.
- `AnswerResult.explain` and `feedback` are shown in the answer sheet after the answer, never before.
- The app asks for the next beat as soon as an answer is graded and keeps it until the child taps Continue, so the API may see `POST /sessions/{id}/beats` before the child is ready (it is the same call as before, only earlier).

## 4. Error catalogue

Every error is `application/problem+json` (RFC 9457):
```json
{ "type": "https://numerix.app/problems/subscription-inactive", "title": "A little break for now", "status": 402,
  "code": "subscription_inactive", "detail": "Your family's subscription is paused.",
  "i18n": { "fr": { "title": "Petite pause pour l’instant", "detail": "..." }, "en": { "title": "A little break for now", "detail": "..." } } }
```
`type` is `https://numerix.app/problems/<code with dashes>`. `title` and `detail` are in the request language (`Accept-Language`) and written for a child or a parent, never a stack trace. `errors[]` (`{field, message}`) is added to `validation_failed`. `retry_after_seconds` is added to `rate_limited`. The frontend switches on **`code`** and falls back to the status (401 `unauthorized`, 404 `not_found`, 429 `rate_limited`, 5xx `internal_error`, else `unknown`). The text shown to the user comes from the app's own translated messages (`src/platform/errors/messages.*.json`, key `errors.<code>`), not from `title`; `i18n` is a safety net for codes the app does not know yet.

| Code | HTTP | Return it when | Frontend behaviour | i18n key (fr-CA / en-CA) |
|------|------|----------------|--------------------|-------------------------|
| `unauthorized` | 401 | Token missing, expired or invalid; wrong email or password at login; refresh token unknown or reused | Parent calls: the proxy tries one silent refresh first. Otherwise a toast "Ta session est terminée" with a login action to `/parent/login`. Login form: "wrong credentials" text. | `errors.unauthorized` |
| `forbidden` | 403 | Wrong role (a child token on a parent route), or the action is not allowed | Toast "Accès refusé" | `errors.forbidden` |
| `forbidden_origin` | 403 | Produced by the **web app proxy**, not the backend: a mutating request whose `Origin` is not the app origin (S1) | Falls into `unknown` today until its message exists (M3) | none yet (`errors.unknown`) |
| `invalid_pin` | 403 | Child token requested with a wrong or missing PIN | PIN dialog stays open, field cleared, text "Ce code ne correspond pas" | `errors.invalid_pin` |
| `consent_missing` | 403 | Token creation, session start or feed read for a child whose parent has not consented | Dialog "Un adulte doit d'abord dire oui"; the picker shows the ask-a-grown-up state | `errors.consent_missing` |
| `daily_limit_reached` | 403 | The child already played `daily_time_limit_minutes` today (child time zone) | Dialog "C'est assez pour aujourd'hui" | `errors.daily_limit_reached` |
| `account_blocked` | 403 | The parent is blocked by an admin. Wins over any subscription state, also under policy `allow`. Body has `i18n`. | Dialog "Le compte est en pause" | `errors.account_blocked` |
| `subscription_inactive` | 402 | Session start while the subscription cannot play and policy is `block` (unpaid, expired, trial ended, canceled and ended). Body has `i18n`. | Dialog "L'abonnement n'est pas actif", progress is kept | `errors.subscription_inactive` |
| `not_found` | 404 | Unknown id, or an id that belongs to another family | Toast or screen "Introuvable" | `errors.not_found` |
| `session_active` | 409 | Session start while the child has an active or paused session | Dialog "Un chapitre est déjà en cours" | `errors.session_active` |
| `session_paused` | 409 | A beat or answer on a paused session | Message "Le chapitre est en pause" | `errors.session_paused` |
| `session_completed` | 409 | A beat or answer on a completed session | Story screen redirects to the done screen | `errors.session_completed` |
| `beat_answered` | 409 | The same beat answered twice with a **different** idempotency key | Story reloads the session ("On recharge ton histoire") | `errors.beat_answered` |
| `beat_not_answered` | 409 | Denouement narration requested before the answer | None expected; falls into `unknown` (M4) | none yet |
| `conflict` | 409 | Generic state conflict (checkout on the plan already held, idempotency key in flight) | Generic error text | `errors.unknown` |
| `not_cancelable` | 409 | Cancel when the subscription is not running | Generic error text on the subscription screen | `errors.unknown` |
| `email_taken` | 409 | Register with an email that exists | Register form: "email already used" (`auth.errors.emailTaken`, the form reads any 409 this way) | form text |
| `validation_failed` | 422 | Body or query invalid, unknown enum, out of range; `errors[]` names fields | Form errors or "Vérifie les informations" | `errors.validation_failed` |
| `rate_limited` | 429 | Too many requests, login attempts or PIN tries; includes `retry_after_seconds` | Toast "Doucement", severity error | `errors.rate_limited` |
| `internal_error` | 500 | Unexpected failure. Never leak details. | Toast with Retry button | `errors.internal_error` |
| `backend_unreachable` | 502 | **Produced by the proxy** when the backend refuses, resets or answers a gateway error without JSON | Toast "Le problème vient de nous" with Retry | `errors.backend_unreachable` |
| `backend_timeout` | 504 | **Produced by the proxy** after 15 s without an answer | Toast "Nos serveurs sont trop lents" with Retry | `errors.backend_timeout` |
| `server_unreachable` | n/a | **Produced by the browser classifier** when the web app itself does not answer | Toast "On n'arrive pas à joindre Numerix" | `errors.server_unreachable` |
| `device_offline` | n/a | **Produced by the browser classifier** when `navigator.onLine` is false | Toast "Ton appareil est hors ligne" | `errors.device_offline` |
| `request_failed` | n/a | The request failed but health is fine (transient) | Toast with Retry | `errors.request_failed` |
| `unknown` | any | Any other code | Toast "Quelque chose s'est mal passé" with Retry | `errors.unknown` |

Admin API codes (admin app only): `unauthorized` 401, `admin_disabled` 503, `invalid_json` 400, `validation_failed` 422, `not_found` 404, `rate_limited` 429, `internal_error` 500, `too_many_attempts` 429 (admin app login, answered by the admin app itself), `invalid_credentials` 401 (admin app login).

Rules for the backend:
1. One stable `code` per situation; add new codes to this table and to `openapi.yaml` in the same change.
2. Never return 200 with an error body. Never return HTML.
3. Use 404 (not 403) for another family's resource.
4. Never reveal in an error whether an email exists (login, password reset).
5. Texts follow the content rules (section 21): plain, kind, no em dashes.
6. Add `Retry-After` header and `retry_after_seconds` to every 429 and 503.
7. No silent failure on the server either: a failed email, push, webhook or narrator call is retried, logged with its error code and counted in a metric that alerts (section 23). A parent is never left unaware of a billing problem: `payment_due` is created before play is blocked.

## 5. Idempotency

| Operation | Key | Rule |
|-----------|-----|------|
| `POST /children/{childId}/sessions` | `Idempotency-Key` required | Replay returns the stored 201 with the same session. A new key while a session is active gets `409 session_active` (the web app generates a new key on every tap, so this rule is what prevents duplicate chapters). |
| `POST /sessions/{sessionId}/beats` | `Idempotency-Key` required | Replay returns the stored beat. Also: while the current beat is unanswered, a call with **any** key returns that same beat with 200. The web app generates a new key per call, so this second rule is the real protection. |
| `POST /sessions/{sessionId}/beats/{beatId}/answer` | `Idempotency-Key` required | The app generates one key per tap and reuses it on retry. Replay returns the stored verdict. A different key for an already answered beat gets `409 beat_answered`. The verdict is stored with the answer, so a retry never changes the outcome or grants a second reward. |
| `POST /subscription/checkout` | `Idempotency-Key` recommended | The web app does not send one yet (M8). The backend must also guard itself: one open checkout per parent and plan; a second call returns the same `checkout_url` for 30 minutes. |
| `POST /auth/consent`, `PUT .../reaction`, `POST .../accept`, `POST .../gift/claim`, `POST /push/subscribe`, `POST /notifications/{id}/read` | none | Naturally idempotent by design. |
| Webhooks | processor event id | Store processed event ids for 7 days. |

Storage: key scope is (parent or child id, method, path). Keep the first response (status and body) for 24 hours. Same key with a different body: `422 validation_failed`. Same key while the first request is still running: `409 conflict` with `retry_after_seconds: 1`. A replayed response should carry header `Idempotent-Replay: true`.

## 6. Pagination and cursors

| Style | Used by | Request | Response |
|-------|---------|---------|----------|
| Cursor | `GET /children/{childId}/sessions`, `GET /children/{childId}/feed`, collection (when it grows) | `limit`, `cursor` | `{ "items": [], "next_cursor": "..." \| null }` |
| Page | every list of the admin API | `page` (from 1), `page_size` (1 to 100, default 20) | `{ "items": [], "page": 1, "page_size": 20, "total": 40 }` |
| None | children (max 8), worlds (8), skills, journey nodes, reviews, notifications (latest 100), challenges | | `{ "items": [] }` |

Cursors are opaque URL-safe strings of at most 256 characters, stable while new rows are added at the head. A malformed cursor answers `422 validation_failed`. `limit` defaults to 20 (max 100); the feed defaults to 5 (max 20). The feed's `next_cursor` is never null.

## 7. Narration SSE protocol

Endpoint: `GET /sessions/{sessionId}/beats/{beatId}/narration?phase=scene|denouement`, child token. The web app opens it with `fetch` and reads the body stream (not `EventSource`), so headers are fully under its control.

**Response headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, status 200. Send headers and the first bytes at once; disable proxy buffering.

**Grammar** (each block ends with a blank line):
```
id: 1
event: scene
data: {"delta":"Zoé et la tour "}

id: 2
event: scene
data: {"delta":"arrivent au pont. Combien de pierres en tout ? "}

id: 3
event: done
data: {}

```
- Event name equals the phase: `scene` for `phase=scene`, `denouement` for `phase=denouement`. `data` is JSON `{"delta": "<text>"}`.
- **Chunk format:** about 4 words per chunk, trailing space kept on every chunk but the last, so the client appends `delta` strings verbatim. UTF-8, no newline inside `delta` (JSON-escape).
- `event: done` with `data: {}` ends a healthy stream. Close the connection after it.
- `event: fallback` with `data: {"text":"<whole canned text>"}` replaces `done` when the model failed, timed out, produced empty text, or the leak check failed twice. The client stops, shows the text, and tells the user the story was simplified (never silent). Close after it. The beat/answer `narration.status` becomes `fallback`.
- **Heartbeat:** a comment line `: ping` followed by a blank line every 5 seconds while no chunk is ready. The client ignores blocks without an `event:`.
- **Timing budget:** first byte within 3 s, last chunk within 8 s. The web proxy cuts every request at **15 s total**, so the backend must send `fallback` by 8 s. Never keep a stream open longer than 12 s.
- **Resume:** every block carries `id: <n>` (1-based). A client that reconnects with header `Last-Event-ID: <n>` gets blocks from `n+1`. The web app reconnects **once, from scratch, without** the header after a dropped stream; so the stream must be replayable from the start. Therefore: store the generated text per (beat, phase) as soon as it exists; a second request for the same (beat, phase) replays the stored text immediately (all chunks in a burst, then `done`), and never calls the model again.
The web app shows a "story is being written" waiting state while nothing arrives. The real backend should treat 3 s without a first chunk as slow (log it) and send `fallback` at 8 s.
- **Errors before the stream:** use normal problem+json statuses (404 unknown beat, 409 `beat_not_answered` when `phase=denouement` before the answer, 409 `session_completed`, 401, 429). After the first byte, errors are only `fallback`.
- **After the stream:** `Beat.scene` and `AnswerResult.denouement` show `{status: "ready", text: "<full text>"}` (or `fallback`), so a reload shows the text without a stream. the real backend must not.
- **Content gates** (checked before the first chunk is sent, so generate the whole text, check it, then stream it in chunks): scene 25 to 60 words, denouement 15 to 45 words; no digits-as-answer and no math symbols (`+ − × ÷ =`) in narration; numbers are said in words; the scene ends with a question; no em dash; the correct answer (as digits or as words, both languages, and the remainder for division) must not appear (`fuite_detectee()`); language equals `Accept-Language`. The denouement depends on the outcome: `correct` celebrates; `erreur_typique` is gentle and adds the one-sentence nudge for the misconception of the skill (section 13); `erreur_aleatoire` offers another try. Never say "wrong", never name a score.

## 8. Subscriptions and payments

### 8.1 Plans and money

CAD only, integer cents. `free` 0, `family_monthly` 899, `family_yearly` 8990. Payment methods offered: `card, interac, paypal, apple_pay, google_pay`. Admin can edit prices, names, features and the method list (`PUT /admin/v1/subscriptions/plans`); parents see changes at once. Taxes (GST and QST) must be handled by the processor; the amount shown to the parent must be the amount charged (BE-44).

### 8.2 Effective status (computed on every read)

| Stored | Effective status | `can_play` | `days_left` |
|--------|------------------|------------|-------------|
| `trial` with `trial_ends_at` in the future | `trial` | true | ceil((trial_ends_at - now) / 1 day) |
| `trial` with `trial_ends_at` passed | `expired` | false | negative or 0 |
| `active` with `renews_at` empty or in the future | `active` | true | days to `renews_at`, null if empty |
| `active` with `renews_at` passed | `expired` | false | |
| `canceled` with `renews_at` in the future | `canceled` | true (until the end) | days to `renews_at` |
| `canceled` with `renews_at` passed | `canceled` | false | |
| `unpaid` | `unpaid` | false | null |
| `expired` | `expired` | false | |

### 8.3 State machine

```
register -> trial (trial_days, default 14; one trial per email)
trial   --checkout paid--> active           trial --trial_ends_at passes--> expired
active  --renewal paid----> active (renews_at += period)
active  --renewal fails---> active during grace --grace ends--> unpaid
unpaid  --payment paid----> active          unpaid --30 days--> expired
active|trial --cancel----> canceled (access until the end) --end--> expired
expired|canceled(ended) --checkout paid--> active
any     --admin PATCH----> any (marked_by_admin = true for paid and unpaid)
```
Grace policy (recommended defaults, constants in the backend): grace 3 days after the first failed renewal; notification `payment_due` on day 0 and day 2; the processor retries the card. Admin marks (`marked_by_admin`) win over processor events until an admin clears them by setting the other state.

### 8.4 Hosted checkout and webhooks

1. Parent taps Subscribe: `POST /subscription/checkout {plan, method}`.
2. Backend creates a processor checkout session for the parent (customer created once, metadata `parent_id`), with `success_url` and `cancel_url` pointing back to `/parent/subscription`. It answers with `checkout_url` (https). The web app navigates there. **No card fields exist in the app, no PCI scope.**
3. Parent pays on the processor page. The processor sends webhooks to `POST /webhooks/payments`.
4. Webhook handling: verify the signature header (HMAC with the endpoint secret, timestamp tolerance 5 minutes) before reading the body; reject otherwise with 400 and no detail. Store the event id and ignore replays (idempotent). Answer 2xx within 5 seconds and do the work after, or keep it short. Tolerate out-of-order events by comparing the event timestamp with the stored one.
5. Events and effects:

| Processor event (names vary) | Effect |
|------------------------------|--------|
| checkout completed | `status=active`, `plan`, `method`, `renews_at` = period end |
| invoice paid (renewal) | `renews_at` advances by the period; clears grace |
| invoice payment failed | start grace; notification `payment_due` |
| subscription canceled at period end | `status=canceled` |
| subscription ended | `status=expired` |
| refund or dispute opened | notify admins; no automatic block |

6. On return from the processor the app reloads `GET /subscription` (it invalidates the query). The webhook may arrive a few seconds later, so the backend should also confirm the session synchronously when the success URL loads.
7. Card details updates and invoices use the processor's customer portal link (add an endpoint later, BE-45).

### 8.5 Gate on play

`POST /children/{childId}/sessions` checks: parent `status == blocked` gives `403 account_blocked`; else if effective `can_play` is false and `unpaid_policy == block` gives `402 subscription_inactive`; policy `allow` lets every non-blocked family play. Reads (feed, collection, journey, settings) stay allowed for unpaid and blocked families so the child's progress is visible. Progress is never deleted because of billing. The policy is read from `PlatformConfig.unpaid_policy` at request time (the admin can flip it live).

### 8.6 Why the policy exists

The original request said unpaid parents' kids "can play" and paid parents' kids "must pay", which is read as a typo. Default `block`: paid or trial families play, unpaid, expired and blocked families get a clear message. `allow` is the literal reading, one click in the admin config.

## 9. Notifications and web push

### 9.1 Server notifications

| Kind | Audience | Created when | Dedupe key |
|------|----------|--------------|-----------|
| `subscription_expiring` | parent | effective status is `trial`, `active` (paid, not renewing) or `canceled`, `can_play`, and `days_left <= expiring_warning_days` | `kind:` + end date |
| `payment_due` | parent | effective status is `unpaid` or `expired` | `kind:` + status + end date |
| `play_reminder` | parent | no chapter played today and local time at or after `reminder_hour_local` (family time zone) | `kind:` + local date |
| `time_limit` | parent | minutes played today >= child's `daily_time_limit_minutes` | `kind:` + local date |
| `announcement` | parent or child | admin broadcast, one row per recipient with a shared `broadcast_id` | broadcast id |

Title and body are stored in the parent's locale (`fr-CA` or `en-CA`). the real backend should create them with a scheduled job and keep only the latest 1500.

The web app also computes **local reminders** on the device from the same rules (`src/features/notify/reminders.ts`) and merges them with server items by `created_at`. They have different ids (`play_reminder:<local day>`), so if the server also creates `play_reminder` or `time_limit` the parent can see both (M12). Until the app dedupes: create `play_reminder` and `time_limit` on the server **only** for parents who have a push subscription, and let the in-app list show the local ones.

### 9.2 Web push (BE-26)

- **VAPID:** generate one key pair per environment. The public key is given to the web app (target env var `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, not wired yet, M7); the private key stays in the backend secret store (`VAPID_PRIVATE_KEY`) with a contact subject (`VAPID_SUBJECT=mailto:support@...`).
- **Subscribe:** after the parent taps the prompt and grants permission, the app registers the push subscription with the service worker and calls `POST /push/subscribe`. The backend upserts by `endpoint`, links it to the parent, keeps `p256dh` and `auth` encrypted at rest, allows 10 subscriptions per parent.
- **Unsubscribe:** `DELETE /push/subscribe`; also delete a subscription when the push service answers 404 or 410.
- **Payload JSON** (at most 3 KB), read by `public/push-sw.js`:
```json
{ "title": "Votre abonnement se termine bientôt", "body": "Renouvelez pour que la famille puisse continuer à jouer.", "url": "/parent/subscription", "tag": "nt-123" }
```
`url` must be a same-origin path starting with `/` (the service worker refuses anything else and opens `/parent`). `tag` collapses duplicates on the device; use the notification id. A plain text payload is shown as the body.
- **Topics and delivery:** use the Web Push `Topic` header = kind plus local date so a newer message replaces an older one; `TTL` 86400 for reminders and 259200 for billing; `Urgency: normal` (`low` for reminders). Never push to children. Quiet hours: no push between 20:00 and 07:00 in the family time zone (except `payment_due`, never at night either).
- **Delivery rules:** one push per notification per subscription, only if the notification is unread after 5 minutes. Respect `features.push` from `PlatformConfig`.
- **Service worker:** `/sw.js` imports `/push-sw.js`. `notificationclick` focuses an open window and navigates, or opens a window.

## 10. Admin API

Base path `/admin/v1`, described in `contracts/openapi.admin.yaml`. Used only by the admin app (`admin/`, its own Vercel project, French first with an English toggle).

### 10.1 Auth

- Every call: `Authorization: Bearer <ADMIN_API_TOKEN>`, compared in constant time. Missing or wrong: `401 unauthorized`. No token configured in production: every route answers `503 admin_disabled`.
- Optional header `x-admin-actor` names the admin for the audit log (default `admin`).
- CORS: only the origins in `ADMIN_ORIGIN` (comma separated) receive `Access-Control-Allow-Origin`, with headers `authorization,content-type,x-admin-actor`, methods `GET,POST,PUT,PATCH,DELETE,OPTIONS`, max age 600. `OPTIONS` answers 204. Others get only `Vary: Origin`.
- The admin app itself has two routes the platform does not implement: `POST /api/auth/login` (body `{password}`, constant-time compare with `ADMIN_PASSWORD`, sets cookie `nx_admin`, 5 failures per 10 minutes per IP then `429 too_many_attempts` with `retry_after`) and `POST /api/auth/logout`. Everything else under the admin app `/api/*` is a pass-through to `PLATFORM_API_URL/admin/v1/*` with the bearer added; path segments are limited to `[A-Za-z0-9_.~-]`, 15 s timeout, and `502 platform_unreachable` when the platform is down.
- A single shared token is acceptable for launch only. Target: per-admin identities with SSO and MFA, actor taken from the verified identity, token rotation (BE-31).

### 10.2 Operations

Paged lists answer `{items, page, page_size, total}`.

#### `GET /admin/v1/overview`
Caller: admin dashboard. Response: the complete `Overview` object; every field in 10.4 is required. All time series have their stated fixed number of points, including `trend_30` with 31 snapshots (30 days ago through today). Do not omit a series when it has no activity; return zero-valued points. The dashboard reads the first and last `trend_30` entries.

#### `GET /admin/v1/parents`
Caller: admin parents list. Query: `status` (`active|blocked`), `subscription` (effective status), `plan`, `q` (name or email, case-insensitive), `page`, `page_size`. Newest first.
```json
{ "items": [ { "id": "aaaaaaaa-0000-4000-8000-000000000001", "email": "marie.tremblay1@example.com", "name": "Marie Tremblay",
               "created_at": "2026-08-02T10:00:00Z", "locale": "fr-CA", "status": "active",
               "subscription": { "status": "active", "plan": "family_monthly", "method": "card", "renews_at": "2026-11-01T10:00:00Z", "can_play": true, "days_left": 19 },
               "children_count": 2 } ], "page": 1, "page_size": 20, "total": 40 }
```

#### `GET /admin/v1/parents/{parentId}`
Caller: parent detail. Response: the parent plus `children: [{id, display_name, grade, last_seen_at}]`. Status 200; 404.

#### `PATCH /admin/v1/parents/{parentId}`
Caller: parent detail and bulk actions (block, unblock, mark paid or unpaid, extend, rename).
```json
{ "status": "blocked", "blocked_reason": "Chargeback signalé par la banque" }
{ "subscription": { "status": "paid", "plan": "family_yearly" } }
{ "subscription": { "extend_days": 14 } }
```
Limits: `name` 1 to 80 characters; `locale` like `fr-CA`; `status` `active|blocked`; `subscription.status` `active|paid|unpaid` (`paid` equals `active`); `subscription.plan` one of the three plans; `extend_days` 1 to 3650. `blocked_reason` is cut at 200 characters, default "Blocked by admin". Marking paid or unpaid sets `marked_by_admin: true`. Paid on a `free` plan becomes `family_monthly`; paid restarts the period only when it is not already running. `extend_days` extends `trial_ends_at` for a trial, else `renews_at`, from the later of now and the current end. Audit action: `parent.block`, `parent.unblock` or `parent.update`. Status 200; 404; 422.

#### `DELETE /admin/v1/parents/{parentId}`
Caller: parent detail, delete with confirmation. Cascade in section 22. Audit `parent.delete`. Status 204; 404.

#### `GET /admin/v1/children`
Caller: admin children list. Query `parent`, `q` (display name), `page`, `page_size`. Each item: `id, parent_id, parent_name, display_name, grade, avatar_id, created_at, last_seen_at, minutes_today, sessions_total, cards_total, skills_mastered, settings`. Most recently seen first. Audited as `children.list`. The admin app also filters grade and activity on the loaded page; a real API should add server filters (BE-33).

#### `GET /admin/v1/children/{childId}`
Caller: child detail. Response: the child plus `parent: {id, name, email}`. Audited as `child.read`. Status 200; 404.

#### `PATCH /admin/v1/children/{childId}`
Caller: child detail form and the language toggle. Body fields (all optional): `display_name` (alias `name`, 1 to 30), `grade` (1 to 6 here), `avatar_id`, `daily_time_limit_minutes` (null or 5 to 180), `kid_can_change_language`, or the same inside `settings`. Settings are validated with the same limits as `PUT /children/{childId}/settings`. Audit `child.update`. Status 200; 404; 422.

#### `GET /admin/v1/children/{childId}/activity`
Caller: child detail "activity". Response: `{child_id, sessions: [≤10 of {id, world, skill_id, skill_name, started_at, status, correct, total, card_awarded}], cards: [≤6 of {id, world, name, earned_at}], skills: [{skill_id, name, mastery_pct}]}`. Audited as `child.activity.read`. Status 200; 404.

#### `GET /admin/v1/subscriptions/plans`
Caller: admin plans screen. Response: the plan catalogue (section 3.8 shape).

#### `PUT /admin/v1/subscriptions/plans`
Caller: admin plans screen, save. Body: `{plans, methods}`. `plans` must hold exactly `free`, `family_monthly`, `family_yearly`, each with `price_cad_cents` 0 to 1000000, `period` (`none|month|year`), `name {fr,en}`, `features {fr[], en[]}`. `methods` non-empty, ids from the five known methods, each with `label {fr,en}`. Audit `plans.update`. Status 200; 422.

#### `GET /admin/v1/config`
Caller: admin config screen. Response: `PlatformConfig` (section 11).

#### `PUT /admin/v1/config`
Caller: admin config screen, save (the unpaid policy change asks for confirmation first). Body: any subset of the config keys; each key is validated (limits in section 11), unknown keys are rejected with 422. Response: the full config. Audit `config.update` with `key=value` pairs.

#### `GET /admin/v1/notifications`
Caller: admin notifications screen and the per-parent notification list (the app reads the latest 100 and filters by parent). Rows are grouped: a broadcast is one row with `recipients`; a single notification is its own row with `parent_id`. Newest first.

#### `POST /admin/v1/notifications/broadcast`
Caller: admin notifications screen. Body: `{audience: "parent"|"child", title, body, filter}`. `title` and `body` are a string or `{fr, en}`; each recipient gets their own locale. `filter` keys (each a value or a list): `subscription` (effective status), `status`, `locale`, `plan`, `parent_ids`. Response 201: `{broadcast_id, recipients}`. Audit `notification.broadcast`. The admin app sends one request per audience. Status 201; 422.

#### `GET /admin/v1/audit`
Caller: admin audit screen. Newest first. The admin app searches actor and target on the loaded page (BE-33 asks for server search).

#### Content operations (question bank, worlds, media)

Callers: the admin question editor, coverage, import and export, and media screens. Same auth, paging, problem codes and audit rules as above; every mutation also writes `question.<action>` audit rows, a version snapshot and the Mongo outbox rows in one transaction. Extra problem codes: `version_conflict` 409, `transition_not_allowed` 409, `needs_reviewer` 409, `not_configured` 503, `draft_failed` 502, `draft_unreadable` 422. The full field list of the numerix-api handlers is in its `docs/ADMIN_API.md`.

- `GET /admin/v1/questions` page of summaries; filters `world quest skill type grade difficulty status author tag q ai`.
- `POST /admin/v1/questions` saves a draft (201); problems are returned, not refused.
- `POST /admin/v1/questions/validate` returns `{ok, issues[], unverified, calc_corrections[]}` without saving.
- `POST /admin/v1/questions/validate-all` counts the failing questions (first 500 listed).
- `POST /admin/v1/questions/ai-draft` 201 with a draft, 503 `not_configured` when no key or model is set, 429 after 30 drafts per hour.
- `GET /admin/v1/questions/export` returns `{schema: 1, questions[]}` in the seed shape.
- `POST /admin/v1/questions/import` takes that shape or an array; `dry_run=1` writes nothing; unchanged questions are a no-op.
- `GET /admin/v1/questions/{id}` returns the record, its versions and the live validation issues.
- `PUT /admin/v1/questions/{id}` saves a new version; header `If-Match` with the loaded version, 409 `version_conflict` when stale.
- `POST /admin/v1/questions/{id}/transition` body `{to, comment}`; review and published need zero blocking issues (422).
- `GET /admin/v1/questions/{id}/versions` lists the saved versions.
- `GET /admin/v1/questions/{id}/versions/{n}` returns one snapshot.
- `POST /admin/v1/questions/{id}/restore` body `{version}`; the old version becomes a new draft version.
- `GET /admin/v1/worlds` lists worlds; `PUT /admin/v1/worlds/{id}` hotfixes one (the seed files own worlds).
- `GET /admin/v1/quests` lists quests (`world` filter); `PUT /admin/v1/quests/{id}` hotfixes one.
- `GET /admin/v1/content/coverage` counts questions by status and type per quest against `target_count`.
- `GET /admin/v1/assets` page of assets with filters; `POST /admin/v1/assets` answers 501 (images come from `tools/assets` and `cmd/seed`).
- `GET /admin/v1/assets/search` scored candidates; `GET /admin/v1/assets/resolve` what a child would get or `fallback: gradient`.
- `GET /admin/v1/assets/{id}` one asset; `PATCH /admin/v1/assets/{id}` edits alt text, review status and safety flags (approval needs alt in both languages, people_free and brand_free).

### 10.3 Audit rules (Law 25)

- Append an `AuditEntry {id, at, actor, action, target_type, target_id, detail}` for **every mutation** and for **every read of a child record**. Actions in use: `parent.block`, `parent.unblock`, `parent.update`, `parent.delete`, `child.read`, `child.activity.read`, `children.list`, `child.update`, `plans.update`, `config.update`, `notification.broadcast`. Parent-side exports add `child.export` (actor `parent:<id>`).
- `target_type`: `parent | child | config | plans | notification`. `target_id` is `*` for list reads and config.
- `detail` is at most 300 characters, never a name, email or free text from a child; ids and field names only.
- Append-only: no update or delete route. Keep at least 12 months. The privacy officer can review it. the real store keeps all.
- Failed admin authentication attempts are logged in the security log, not in this audit list.

### 10.4 Analytics series (definitions)

All figures come from stored records; nothing is hard-coded. Day boundaries are **UTC** for platform analytics. `monthly(plan)` = `price_cad_cents` for a monthly plan, `round(price / 12)` for a yearly plan, 0 for free.

| Field | Definition |
|-------|-----------|
| `parents_total` | Number of parent accounts. |
| `by_subscription` | Count of parents per **effective** status (`trial, active, unpaid, expired, canceled`), all five keys always present. |
| `blocked` | Parents with `status = blocked`. |
| `kids_total` | Number of child profiles. |
| `active_today` | Kids with a session today, equal to kids whose `last_seen_at` is today. |
| `mrr_cad_cents` | Sum of `monthly(plan)` over parents whose effective status is `active` and who are not blocked. |
| `arpu_cad_cents` | `round(mrr / paid)` where `paid` is the number of active paid parents, 0 when none. |
| `churn_30d` | Distinct parents whose paid segment was canceled or ended in the last 30 days. |
| `retention` | Among kids created at least 30 days ago (`eligible`), those with at least one active day in the last 7 days including today (`active`); `pct = round(1000 * active / eligible) / 10`, 0 when none eligible. |
| `signups_by_day_30`, `signups_30d_total` | Parents created per UTC day over the last 30 days; the total is their sum. |
| `signups_by_month_12` | Parents created per month over 12 months ending with the current month (`YYYY-MM`). |
| `active_kids_by_day_30` | Per day, kids with at least one minute played. |
| `minutes_by_day_30` | Per day, total minutes played by all kids. |
| `sessions_by_day_30` | Per day, number of chapters played. |
| `activity_by_day_90` | The three series above for 90 days: `{date, active_kids, minutes, sessions}`. |
| `subscription_mix` | `by_subscription` as a list. |
| `plan_mix` | Per plan id: `count` of parents on that stored plan, and `mrr_cad_cents` contributed by active, non-blocked parents. Sum of plan MRR equals `mrr_cad_cents`. |
| `mrr_by_month_12` | MRR at the end of each of the last 12 months (current month: live value), from subscription history segments. |
| `kids_by_grade` | Grades 1 to 6 always present, with zero counts. |
| `top_worlds` | Chapters played per world over the last 30 days, descending, all eight worlds listed. |
| `trend_30` | 31 daily snapshots (30 days ago to now): `parents, kids, paid, mrr_cad_cents, arpu_cad_cents, churn_30d, retention_pct`, each computed as of the end of that day. |

The real store needs a subscription history table (`SubscriptionSegment`, section 12) and a per-kid per-day activity table (`minutes`, `sessions`, `world`). Cache the overview for 60 seconds. Consistency rules the tests check: subscription_mix sums to parents_total; kids_by_grade sums to kids_total; plan_mix MRR sums to mrr; the 30-day series have 30 points and end today; the month series have 12 points and end with the current MRR.

## 11. Platform config

Stored as one document, read at request time, edited only through `PUT /admin/v1/config`.

| Key | Type | Default | Limits | Effect |
|-----|------|---------|--------|--------|
| `card_threshold_pct` | number | 70 | 0 to 100 | Share of first-try right answers needed to award a card and complete a journey step (section 14). Returned in `Score.threshold_pct` and `GET /platform/public`. |
| `unpaid_policy` | `block` \| `allow` | `block` | enum | Gate on session start (section 8.5). Changing it asks for confirmation in the admin app. |
| `trial_days` | integer | 14 | 0 to 365 | Length of the trial given at registration. |
| `daily_time_limit_minutes_default` | integer or null | 60 | null or 5 to 180 | Default limit for new children (null means no limit). Written into `ChildSettings` at child creation. |
| `reminder_hour_local` | integer | 17 | 0 to 23 | Local hour after which a play reminder is allowed. |
| `expiring_warning_days` | integer | 7 | 0 to 60 | Days before the end of a trial or a canceled period that raise `subscription_expiring`. |
| `default_locale` | string | `fr-CA` | pattern `^[a-z]{2}-[A-Z]{2}$` | Locale of new parents without one. |
| `features` | map of booleans | `{feed: true, challenges: true, push: false, payments: true}` | any key, boolean values | Server side feature flags returned by `GET /platform/public`. The web app does not read them yet; its own `NEXT_PUBLIC_FEATURE_*` variables decide today. When `payments` is false the checkout answers 503 `internal_error` copy "payments are paused" (BE-44). |

Public subset (no token): `unpaid_policy, card_threshold_pct, trial_days, default_locale, expiring_warning_days, reminder_hour_local, daily_time_limit_minutes_default, features`.

## 12. Data model

Relational model (PostgreSQL target). `id` columns are UUID v4 unless noted. Times are `timestamptz` in UTC. Strings are UTF-8.

| Entity | Fields (type, limits) | Notes |
|--------|----------------------|-------|
| `parent` | `id`; `email` (citext, unique, ≤ 254); `password_hash`; `name` (≤ 80, default the email prefix); `locale` (`fr-CA`\|`en-CA`, other codes tolerated); `status` (`active`\|`blocked`); `blocked_reason` (≤ 200); `blocked_at`; `email_verified_at`; `created_at`; `deleted_at` | One row per family. |
| `refresh_token` | `id`; `parent_id`; `family_id`; `token_hash`; `created_at`; `expires_at`; `used_at`; `revoked_at` | Rotation and reuse detection. |
| `child` | `id`; `parent_id`; `display_name` (≤ 30); `birth_year`; `grade` (1 to 4 in the kid contract, 1 to 6 in admin); `avatar_id` (≤ 40); `pin_hash` (nullable); `consent_given` (derived from `consent`); `favorite_world` (nullable world id); `timezone` (IANA, default `America/Toronto`); `onboarding_completed`; `created_at`; `last_seen_at` | At most 8 per parent. |
| `child_settings` | `child_id`; `daily_goal_chapters` (1 to 5, default 1); `daily_time_limit_minutes` (null or 5 to 180); `enabled_worlds` (non-empty subset of the 8, default all); `read_aloud` (default true); `sound` (default true); `kid_can_change_language` (default true) | |
| `consent` | `id`; `parent_id`; `child_id`; `notice_version`; `notice_hash`; `accepted_at`; `ip_prefix`; `user_agent_family` | Evidence, kept after child deletion (ids only). |
| `session` | `id`; `child_id`; `world`; `kind` (`chapter`\|`daily_quest`\|`onboarding`); `status` (`active`\|`paused`\|`completed`\|`abandoned`); `chapter_length` (3); `skill_id`; `seed`; `story_title`; `started_at`; `ended_at`; `active_seconds` | Derived: `beats_answered`, `score`. |
| `beat` | `id`; `session_id`; `index` (0 to 2); `skill_id`; `math_text`; `choices` (4 values, JSON); `correct_answer` (JSON, **server only until answered**); `typical_answer` (JSON, server only); `scene_text`; `scene_status`; `created_at` | The two answer columns are never selected into a response before the answer. |
| `answer` | `beat_id`; `given` (JSON); `outcome` (`correct`\|`erreur_typique`\|`erreur_aleatoire`); `response_time_ms`; `denouement_text`; `denouement_status`; `answered_at`; `idempotency_key` | One per beat. |
| `skill_progress` | `child_id`; `skill_id`; `mastery` (0 to 1); `attempts`; `last_practiced_at`; `next_review_at`; `level` (0 to 5) | Per child and skill (per world in the stand-in model). |
| `misconception_seen` | `child_id`; `skill_id`; `code`; `seen_at` | Feeds progress and reports (last 30 days). |
| `card` | `id` (UUID, or `ch-<challenge>` or `welcome`); `child_id`; `world`; `title_fr`; `title_en`; `image_url` (empty until art exists); `session_id` (nullable); `source` (`chapter`\|`challenge`\|`welcome`); `earned_at` | One per chapter at most. |
| `challenge_state` | `child_id`; `challenge_id`; `accepted_at`; `completed_at`; `card_id` | Catalogue is code or table (section 14). |
| `gift` | `child_id`; `claimed_at`; `card_id` | At most one. |
| `feed_reaction` | `child_id`; `item_id`; `liked`; `saved`; `updated_at` | Private to the child. |
| `subscription` | `parent_id`; `status` (`trial`\|`active`\|`unpaid`\|`expired`\|`canceled`); `plan` (`free`\|`family_monthly`\|`family_yearly`); `method`; `renews_at`; `trial_ends_at`; `marked_by_admin`; `processor_customer_id`; `processor_subscription_id`; `grace_until` | One per parent. |
| `subscription_segment` | `id`; `parent_id`; `plan`; `started_at`; `ended_at` (null while running); `canceled_at` | History for MRR, churn. |
| `notification` | `id` (string, ≤ 64); `parent_id`; `kind`; `title`; `body`; `created_at`; `read`; `audience`; `broadcast_id`; `key` (dedupe) | Keep latest 1500. |
| `push_subscription` | `id`; `parent_id`; `endpoint` (unique); `p256dh` (encrypted); `auth` (encrypted); `created_at`; `last_success_at` | Max 10 per parent. |
| `platform_config` | one JSON document | Section 11. |
| `plan_catalog` | one JSON document | Section 3.8 shape. |
| `audit_entry` | `id`; `at`; `actor` (≤ 80); `action`; `target_type`; `target_id`; `detail` (≤ 300) | Append-only. |
| `idempotency_record` | `scope`; `key`; `request_hash`; `status`; `body`; `created_at` | 24 h TTL. |
| `webhook_event` | `provider_event_id` (unique); `received_at`; `processed_at` | 7 day TTL. |
| `activity_day` | `child_id`; `date`; `minutes`; `sessions`; `world` | Analytics (section 10.4). |

Enums: world ids `nature, espace, cuisine, sport, construction, medecine, science, echecs`; node states `locked, available, in_progress, mastered, needs_review`; outcomes `correct, erreur_typique, erreur_aleatoire`; reward types `chapter_complete, card_earned, streak_extended, skill_mastered, daily_goal_met`; notification kinds `play_reminder, time_limit, subscription_expiring, payment_due, announcement`; payment methods `card, interac, paypal, apple_pay, google_pay`.

## 13. Game engine boundary

**The one rule: the LLM never does math.** The deterministic engine builds the problem, holds the answer and rules on the answer. The narrator only writes text around it.

1. **Answers stay hidden (BE-01).** The correct answer and the misconception answer exist only inside the engine and in the two server-only beat columns. They never appear in `Beat`, `Session.current_beat`, `GET /sessions/{id}`, feed puzzles, the journey, logs, caches, analytics, error bodies or any SSE stream. After the child answers, `AnswerResult.correct_answer` reveals the correct value (and only then).
2. **Three outcomes.** `correct`: the answer equals the engine's correct value. `erreur_typique`: it equals the documented misconception answer of the skill (for example 11 + 6 mistaken for the sum without carry). `erreur_aleatoire`: anything else. Comparison is numeric: integers and numeric strings compare as numbers; division with remainder compares `[quotient, remainder]` element by element. The outcome only selects which story beat is shown; it is never shown as success or failure chrome, never as a score on the play screen.
3. **Question shape.** `math_text` is plain text the app prints and the test solver parses: `a + b = ?`, `a − b = ?` (U+2212), `a + ? = c`, `a × b = ?`, `N ÷ k = ?`, and `N ÷ k = ? (avec reste)` / `(with remainder)`. `choices` has exactly 4 distinct values: the correct value, the typical-error value, and two near values (the correct value plus or minus small steps), never negative, shuffled with the session seed. Division with remainder uses `[q, r]` pairs.
4. **Determinism and variety.** A problem is a pure function of (skill, seed, beat index) so a replay is identical; numbers and wording change on every new session (new seed).
5. **Chapter loop.** A chapter is 3 beats. `POST .../sessions` creates the session and picks a story title from the world kit; each `POST .../beats` returns the next question (or the open one); each answer returns the verdict, the rewards on the last beat, and the new session state. The planner picks the skill (review, consolidation, new, upkeep) unless `skill_id` is given; an unknown or missing id falls back to the first implemented skill. `kind=onboarding` serves fixed easy problems and does not count in mastery; `kind=daily_quest` uses the due reviews.
6. **Skill ids and misconception codes** (the seven skills with generators in the contract; 75 exist in the curriculum, `GET /skills`):

| Skill id | Name (fr / en) | Misconception code | Description fr | Description en |
|----------|----------------|--------------------|---------------|---------------|
| `ARI-OPE-A02a` | Additions rapides / Quick sums | `retenue_oubliee` | Oublie la retenue dans une addition | Forgets the carry in an addition |
| `ARI-OPE-A03a` | Calcul mental / Mental math | `petit_moins_grand` | Soustrait toujours le plus petit chiffre du plus grand | Always subtracts the smaller digit from the larger one |
| `ARI-OPE-A05` | Le terme manquant / The missing term | `addition_au_lieu_soustraction` | Additionne au lieu de soustraire pour trouver le terme manquant | Adds instead of subtracting to find the missing term |
| `ARI-OPE-A06a` | Les tables / Times tables | `addition_au_lieu_multiplication` | Additionne les deux nombres au lieu de les multiplier | Adds the two numbers instead of multiplying them |
| `ARI-SOP-A03a` | Partager et grouper / Share and group | `soustraction_au_lieu_division` | Soustrait au lieu de partager en parts égales | Subtracts instead of sharing equally |
| `ARI-OPE-A07a` | Division avec reste / Division with remainder | `reste_ignore` | Ignore le reste dans une division | Ignores the remainder in a division |
| `ARI-SEN-A01c` | Grands nombres / Big numbers | `retenue_grands_nombres` | Oublie la retenue avec les grands nombres | Forgets the carry with big numbers |

   Typical-error value per skill: carry forgotten = `sum − 10`; borrow reversed = `10 * (tensA − tensB) + (onesB − onesA)`; missing term added instead = `c + a`; times table added = `a + b`; share subtracted = `N − k`; remainder ignored = `[q, 0]`; big-number carry forgotten = `sum − 1000`. Each new misconception adds a row here and a nudge in both languages.
7. **Mastery.** Stand-in model used by tests: start 0; right answer +0.25 (max 1); typical mistake −0.15; other mistake −0.10 (min 0); after 3 idle days mastery decays by 0.05 per idle day. A skill is `mastered` at 0.75 or more. The server may use a better model (Bayesian knowledge tracing or similar) if: mastery is a probability in 0 to 1 that decays with time; three right answers in a row on a fresh skill reach `mastered`; mistakes never drop it below 0; states follow section 14.
8. **Spaced review.** A mastered skill becomes `needs_review` after 7 days without practice in the stand-in model; the server should schedule `next_review_at` at +1, +3, +7, +14, +30 days after each successful review (the `level`, 0 to 5, counts distinct days with a right answer). `GET /children/{childId}/reviews` lists due items; the daily quest uses them.
9. **Narrator contract.** Input to the LLM: world kit, language, skill name, numbers in words, outcome for the denouement, misconception nudge. Never the child's name or any identifier (section 22). Output is checked by the leak detector (digits and number words of the answer in both languages), word counts, symbols, language, em dashes; retry once; then `fallback` (section 7). Narrator state is exposed as `narrator` in `/health`.
10. **Daily limit.** `daily_time_limit_minutes` counts active play minutes of the child's local day. At session start, if reached: `403 daily_limit_reached`. The web app never enforces it (it only shows reminders), so the server must (BE-38).

## 14. Progress, streak, daily goal, quest, cards, challenges, gift

All day boundaries use the **child's time zone** (`Child.timezone`).

- **Chapter completion:** a chapter is completed when its 3rd beat is answered, or the child finishes it early with `POST /sessions/{id}/finish` (then it is `abandoned` if fewer than 3 answers).
- **Score object** (`Session.score`, on the answer result and the summary): `correct` = beats with outcome `correct`; `total` = answered beats; `pct = round(1000 * correct / total) / 10` (0 when total is 0); `threshold_pct` = `card_threshold_pct`; `card_awarded = completed && total > 0 && pct >= threshold_pct`. With 3 beats and the default 70, only 3 of 3 passes (2 of 3 is 66.7); with 50, 2 of 3 passes. The play screen never shows it.
- **Card threshold rule:** the same test decides the card and whether the journey step counts as completed (opening the next step). The threshold comes from the platform config;
- **Cards:** one card per completed chapter that passes, `card_earned` reward on the last answer; id is a UUID, `session_id` set, `world` = session world, `title` = story title. Challenge cards have id `ch-<challenge id>`. The gift card has id `welcome`. A card is never awarded twice for the same session or challenge. Whenever an action completes a challenge (the last answer of a chapter, a like, a puzzle), the response of that action carries the challenge card as a `card_earned` reward (id `ch-<challenge id>`), because the app shows its celebration from the response, not by polling.
- **Streak:** days (in the child's time zone) with at least one **completed** chapter. `current_days` counts consecutive days ending today, or ending yesterday if nothing was done yet today (so the streak survives until the day ends). `longest_days` is the longest run ever; always at least `current_days`. `last_active_date` is the latest such day or null. A missed day resets to 0 with no punishment screen. Milestones 3, 7 and 14 days are celebrated by the app from `current_days`.
- **Daily goal:** `target_chapters` = `daily_goal_chapters` (1 to 5); `done_chapters` = completed chapters today.
- **Rewards emitted at the end of a chapter:** `chapter_complete` always; `card_earned` when `card_awarded`; `skill_mastered` when this chapter moved the skill's mastery up through 0.75; `streak_extended` (with `streak_days`) when it is the first completed chapter of the day; `daily_goal_met` when `done_chapters` reaches the target today. The app handles all five types and ignores unknown ones.
- **Daily quest:** one per child per day; `skill_ids` = skills in `needs_review`, else the current skill; completed when a `daily_quest` session completed today.
- **Growth** (window `W` = 7 or 30 days; `current` = last `W` days, `previous` = the `W` days before): `chapters_completed` = completed sessions ended in the period; `skills_mastered` = upward crossings of mastery 0.75 in the period; `minutes_played` = sum over sessions started in the period that have at least one answer of the active duration clamped to 1 to 20 minutes.
- **Weekly report:** week Monday to Sunday in the child's time zone; `sessions`, `days_played` (distinct days with a session), `skills_practised` (distinct skill ids), `stuck_points` (misconceptions of every `erreur_typique` in the week), `growth` as above.
- **Challenges** (BE-20). Progress counts events after `accepted_at` only; a challenge completes when progress reaches target and then awards its card once.

| Id | Metric | Target | Card world | Title fr / en | Reward label fr |
|----|--------|--------|-----------|---------------|-----------------|
| `first_steps` | `chapters_done` | 1 | nature | Premiers pas / First steps | Une carte de héros |
| `sharp_three` | `correct_streak` | 3 | sport | Triplé gagnant / Winning hat trick | Une carte rare |
| `world_tourist` | `worlds_played` | 3 | espace | Touriste des mondes / World tourist | Une carte voyageuse |
| `story_marathon` | `chapters_done` | 3 | science | Marathon d’histoires / Story marathon | Une carte brillante |
| `feed_fan` | `likes` | 5 | cuisine | Curieux de tout / Curious about everything | Une carte cœur |
| `puzzle_pro` | `puzzles_correct` | 3 | echecs | Pro des casse-têtes / Puzzle pro | Une carte mystère |
| `daily_hello` | `days_played` | 2 | medecine | Retour de flamme / Welcome back | Une carte soleil |

  Metrics: `chapters_done` completed chapters; `correct_streak` longest run of `correct` answers in a row; `worlds_played` distinct worlds with a started session; `likes` distinct feed items currently liked (an unlike removes one); `puzzles_correct` feed puzzles answered `correct`; `days_played` distinct days with a completed chapter. Full texts (descriptions and card titles in both languages) are in `src/domain/game/catalog.ts`, constant `CHALLENGES`; the backend stores the same strings.
- **Gift:** one welcome gift per child, a card (`welcome`, world nature, "Le cadeau de bienvenue" / "The welcome gift"); `gift_available` is true until `POST .../gift/claim` succeeds.
- **Tour:** the first-run guided tour sets `onboarding_completed`.

## 15. State ownership

The server owns all game state: journey, home, engagement, growth, collection, progress, challenges and the welcome gift. The device keeps only preferences and caches (below). Sessions, beats and answers always go to the server because grading needs it.

| Action | Meaning | Endpoint |
|----------------------------------|--------------|------------------------|
| `start` | session begins, mode `chapter`, `daily_quest`, `challenge` or `onboarding` | `POST /children/{childId}/sessions` (the `challenge` mode does not exist server side: a challenge is accepted with `accept`, and plays are normal chapters) |
| `answer` | outcome appended with beat index | `POST /sessions/{sessionId}/beats/{beatId}/answer` |
| `finish` | `done:true` after the last answer, `done:false` when the child leaves | automatic on the last answer; early exit is `POST /sessions/{sessionId}/finish` |
| `card` | a card is stored (source chapter, challenge or welcome) | `card_earned` reward on the answer; read with `GET /children/{childId}/collection` |
| `react` | like and save recorded | `PUT /children/{childId}/feed/{itemId}/reaction` |
| `puzzle` | puzzle outcome recorded | `POST /children/{childId}/feed/{itemId}/answer` |
| `accept` | challenge accepted at time `t` | `POST /children/{childId}/challenges/{challengeId}/accept` |
| `gift` | welcome gift claimed (with its `card` event) | `POST /children/{childId}/gift/claim` |
| `tour` | guided tour done | `PATCH /children/{childId}` with `onboarding_completed: true` |

Reads the server must answer (hook, endpoint): `useHome` `GET /children/{childId}/home`; `useJourney` `GET /children/{childId}/journey`; `useCollection` `GET /children/{childId}/collection`; `useEngagement` `GET /children/{childId}/engagement`; `useGrowth` `GET /children/{childId}/growth`; `useDailyQuest` `GET /children/{childId}/quests/daily`; `useProgress` `GET /children/{childId}/progress`; `useSessionList` `GET /children/{childId}/sessions`; `useSessionSummary` `GET /sessions/{sessionId}/summary`; `useWeeklyReport` `GET /reports/weekly`. Always from the server in both modes: children, settings, worlds, feed, subscription, notifications, platform.

On a device the following stays local: language cookie, theme cookies, preferences (`nx:prefs:v1`: sound, vibration, voice), the child's first name and avatar cache (`nx:child:<id>:profile`), tour flag key `nx:onboarding:<id>`, greeting flags (sessionStorage `nx:greet:*`), temporary rewards (`nx:rewards:<sessionId>`), seen notification ids (`nx:notified`), notification prompt dismissal (`nx:notify-prompt-dismissed`), parent email for the gate (`nx:parent-email`). Signing out as a grown-up clears everything under `nx:`; changing player clears memory only.


## 16. Rate limits

Limits per key; answer `429 rate_limited` with `retry_after_seconds` (and `Retry-After`). Values are launch defaults; keep them in config.

| Scope | Key | Limit |
|-------|-----|-------|
| `POST /auth/login` | IP, and email | 10 per minute per IP; 5 failures per 15 minutes per email |
| `POST /auth/register` | IP | 5 per hour |
| `POST /auth/refresh` | IP | 30 per minute |
| `POST /auth/password/*`, `POST /auth/verify-email` | IP, email | 5 per hour |
| `POST /children/{childId}/token` | parent | 10 per minute; 5 wrong PINs per child per 15 minutes |
| `POST /children/{childId}/sessions` | child | 10 per minute |
| `POST /sessions/{sessionId}/beats`, `.../answer`, `.../narration` | session | 30 per minute each |
| `GET /children/{childId}/feed` and feed writes | child | 60 per minute |
| Other reads | user | 300 per minute |
| Other writes | user | 60 per minute |
| `POST /push/subscribe` | parent | 10 per hour |
| `POST /subscription/checkout` | parent | 10 per hour |
| `POST /webhooks/payments` | none (signature) | no limit |
| `/admin/v1/*` | token | 120 per minute |
| Admin app login | IP | 5 failures per 10 minutes (in memory per serverless instance, add an edge rule) |
| Everything | IP | 600 per minute at the edge |

Abuse controls to add (BE-42): signup throttling and disposable-email checks, credential stuffing detection on login, per-parent child-profile cap (8), request size cap (64 KB JSON), connection limits on SSE.

## 17. CORS and CSP

**CORS.** The backend serves only the web app server and the admin app server, so it sends **no** CORS headers for the web origin and must not answer preflight for it. The browser never calls the backend directly (CSP `connect-src 'self'`). The platform admin API sends `Access-Control-Allow-Origin` only for the origins in `ADMIN_ORIGIN` (section 10.1).

**CSP of the web app** (set in `vercel.ts`, same on every page):
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <IMAGE_HOSTS as https://host>; media-src 'self' blob:; font-src 'self' data:;
connect-src 'self' <CONNECT_ORIGINS>; worker-src 'self' blob:; manifest-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```
Other headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()`. `/sw.js` is `no-cache, no-store, must-revalidate`; `/sounds/*` and `/icons/*` are `public, max-age=31536000, immutable`.

**Backend consequences:**
- Image URLs the API returns (`World.image_url`, `StoryCard.image_url`, avatars) must be on one CDN host that is added to `IMAGE_HOSTS` (BE-13); an empty string is valid and means "draw the placeholder".
- `'unsafe-inline'` for scripts is a known limit (ADR 0003). Target: per-request nonces from the web proxy, then remove `unsafe-inline`. Backend deliverable: a CSP report endpoint `POST /csp-report` (accepts `application/csp-report` and `application/reports+json`, answers 204, rate limited, stores no personal data) so violations can be watched before and after the switch (BE-29). The web app adds `report-uri` once it exists.
- **Origin check (S1):** the web proxy will reject mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) whose `Origin` header is not the app origin with `403 forbidden_origin`. The backend does not see `Origin` (the proxy does not forward it); the backend is protected by bearer auth. If a future client talks to the backend directly, the backend must check its own allow list (BE-30).
- Cookie `SameSite=Lax` plus the origin check is the CSRF defence in the browser; the backend has no cookies.

## 18. Request headers

Sent by the **browser** to the web app, and what reaches the **backend**:

| Header | Sent by | Reaches backend | Meaning |
|--------|---------|:---------------:|---------|
| `Accept-Language` | proxy, from cookie `NEXT_LOCALE` else the browser's value | yes | `fr-CA` or `en-CA`; selects every localized string. Default `fr-CA`. Never infer the language from the IP address; the device language wins, as the product prompt requires. |
| `Authorization: Bearer` | proxy, from a cookie | yes | Parent or child access token. |
| `Idempotency-Key` | web app on `startSession`, `nextBeat`, `answerBeat` (uuid v4) | yes | Section 5. |
| `Content-Type` | web app | yes | `application/json`. |
| `Accept` | web app | yes | `text/event-stream` for narration. |
| `Last-Event-ID` | the browser, if the client sets it | yes | SSE resume; the current client does not set it. |
| `x-nx-mode` | web app on every call (`parent` or `child`) | **no** | Tells the proxy which cookie to turn into a bearer. |
| `x-admin-actor` | admin app (optional) | admin API | Audit actor. |
| `Authorization: Bearer <ADMIN_API_TOKEN>` | admin app | admin API | Section 10.1. |

Responses: the proxy returns only `content-type` and `cache-control` to the browser. Set `Cache-Control: private, no-store` on every personal response; `public, max-age=300` is fine for `GET /worlds` and `GET /platform/public`. The service worker caches `GET` responses for `/api/v1/worlds` and `/api/v1/children/{id}/(journey|collection|home|engagement|growth)` network-first as an offline fallback and clears that cache on sign out; no other API response is cached or queued. Recommended response headers for diagnosis: `X-Request-Id` on every response (the proxy drops it today, BE-47), `Idempotent-Replay`, `Retry-After`, `Deprecation`/`Sunset` (section 20).

## 19. Health and readiness

| Endpoint | Used by | Expectation |
|----------|---------|-------------|
| `GET /health` | web app `/api/health` (error classifier), synthetic monitor | 200 `{status, narrator, version}` in under 100 ms, no database call. Non-2xx or no answer in 3 s means "backend unreachable" to the user. `narrator` shows `llm`, `stub` (canned text only) or `down`. `status: degraded` when the narrator is not `llm`. |
| `GET /ready` | load balancer / orchestrator | 200 when the database, cache, engine and narrator client are usable; 503 with the failing check names otherwise. |
| `GET /api/health` (web app) | browser classifier | `{app:"ok", backend:"ok"\|"timeout"\|"unreachable"\|"error", host}`. |

The web app only distinguishes ok, timeout, error and unreachable. A slow `/health` (over 3 s) is shown to users as "our servers are too slow".

## 20. Versioning and deprecation

- The URL carries the major version: `/v1`. `info.version` of the OpenAPI files is semver; bump minor for additive changes, major for breaking ones.
- Additive changes allowed inside v1: new optional request fields, new response fields, new endpoints. Clients ignore unknown fields.
- New values of an existing enum (outcomes, reward types, notification kinds, node states, error codes) are treated as breaking for server-emitted enums unless the frontend release that handles them ships first. The frontend maps any unknown error code to `unknown` and ignores unknown reward types.
- Breaking changes require `/v2` served side by side. Deprecate with headers `Deprecation: true` and `Sunset: <date>` and at least 90 days of overlap, announced in `BACKEND_REQUIREMENTS.md`.


## 21. Content rules

- **Languages:** French (fr-CA) first, English (en-CA) second. Every user-facing string exists in both languages with the same ids (worlds, skills, journey labels, story titles, cards, challenges, notifications, plan names and features, error text). The language is the request's `Accept-Language`; the device language is the default.
- **Reading level:** children aged 6 to 11, Quebec grades 1 to 4. Short sentences (about 12 words on average, 20 at most), everyday words, one idea per sentence. Numbers in narration are written in words. Scenes 25 to 60 words, denouements 15 to 45, feed stories 35 to 60, facts 20 to 40, challenges 15 to 30.
- **Voice:** warm, second person ("tu"), encouraging, human. No em dashes anywhere in the product text, no AI-sounding phrases ("Certainly", "As an AI", "Voici"), no jargon. Never "faux", "wrong", "échec", "perdu". Mistakes are "another path". No scores, hearts, lives, timers, leagues or rankings in play.
- **Read aloud:** all narration is read by the device voice; no meaning carried by emoji alone, no abbreviations, no symbols in narration.
- **No child free text:** children only tap choices. No chat, no comments, no names typed by the child; the profile name is typed by the parent. The backend must reject any endpoint design that stores free text from a child.
- **AI generated content:** the feed and the narration are generated by Numerix only, every feed item has `ai_generated: true` and the app shows an "AI generated" label; characters Pip (fox) and Lumi (owl) are fictional. No user generated content is shown to other users.
- **Safety filter** on every generated text: no profanity, violence, fear, medical or political topics, brand names, real people, links, or personal data other than the child's first name. A failed filter counts as a fallback.
- **Fallback texts** exist for every world and phase in both languages.
- **Forbidden in any response or screen:** hearts or lives, XP, levels as scores, leaderboards, ranks, comparisons with other children, per-question countdowns, "failed" flags. `response_time_ms` feeds mastery only and is never shown. `Growth` compares a child only with their own past.
- **Admin-entered public text** (plan names and features, broadcast titles and bodies, blocked reasons shown to families) is held to the same rules: the platform should reject an em dash with `422 validation_failed`, and the admin app shows the rule.
- **Inclusive imagery:** avatars are drawn locally from the `avatar_id` (varied skin tones, hair, accessories); the backend only stores the id.

## 22. Privacy (Quebec Law 25)

### 22.1 What is collected
Parent: email, password hash, locale, subscription, consent records, push endpoints. Child: first name or nickname, grade, birth year, avatar id, time zone, settings, sessions, answers, mastery, cards, reactions, time played. Not collected: child email, address, phone, photos, voice, free text, precise location, device ids, advertising ids. No third-party trackers; no analytics SDK; the optional `POST /events` carries no names.

### 22.2 Retention

| Data | Kept | Deleted |
|------|------|---------|
| Child progress, answers, cards, settings | while the profile exists | within 30 days of `DELETE /children/{childId}` in the primary store, 35 days in backups |
| Consent evidence | while the profile exists and 2 years after | ids and notice version only, no name |
| Parent account | while active | 30 days after deletion request; processor invoices kept as tax law requires (7 years, at the processor) |
| Refresh tokens, idempotency records, webhook ids | 30 days, 24 h, 7 days | automatic |
| Audit log | at least 12 months | policy by the privacy officer |
| Application logs | 30 days | automatic; no names, emails or answers in logs |
| Analytics aggregates | 13 months | automatic |
| Push subscriptions | until unsubscribed or the push service answers 404 or 410 | |

### 22.3 Export (access and portability)
`GET /children/{childId}/export` returns a JSON document, `Content-Disposition` not needed (the app saves it):
```json
{ "exported_at": "2026-10-13T12:00:00Z", "format_version": 1,
  "child": { "id": "...", "display_name": "Zoé", "birth_year": 2018, "grade": 3, "avatar_id": "fox", "timezone": "America/Toronto", "created_at": "..." },
  "settings": { "daily_goal_chapters": 1, "daily_time_limit_minutes": null, "enabled_worlds": ["nature"], "read_aloud": true, "sound": true, "kid_can_change_language": true },
  "consent": [ { "notice_version": "2026-10", "accepted_at": "2026-10-12T14:00:00Z" } ],
  "sessions": [ { "id": "...", "world": "echecs", "kind": "chapter", "status": "completed", "started_at": "...", "ended_at": "...", "story_title": "...",
                  "beats": [ { "index": 0, "skill_id": "ARI-OPE-A06a", "math_text": "6 × 7 = ?", "given": 42, "outcome": "correct", "answered_at": "..." } ] } ],
  "progress": [ { "skill_id": "ARI-OPE-A06a", "mastery": 0.75, "attempts": 6, "last_practiced_at": "...", "next_review_at": null } ],
  "cards": [ { "id": "...", "world": "echecs", "title": "...", "earned_at": "..." } ],
  "reactions": [ { "item_id": "feed-3", "liked": true, "saved": false } ],
  "challenges": [ { "id": "sharp_three", "accepted_at": "...", "completed_at": null } ] }
```
the real export must be complete. It never includes the PIN hash or other families' data. Audit `child.export`.

### 22.4 Delete and cascade
`DELETE /children/{childId}` removes the child, settings, sessions, beats, answers, mastery, misconceptions, cards, challenge state, gift, reactions, `activity_day` rows, idempotency records and cached aggregates, then scrubs the child id from logs after 30 days. It also revokes any child token (add the child to a deny list until the token expires). `DELETE /admin/v1/parents/{parentId}` and `DELETE /account` do the same for all children plus the parent, subscription (the processor subscription is canceled and the customer deleted), notifications, push subscriptions and refresh tokens. A deletion is audited.

### 22.5 Consent and parental evidence
A child profile cannot play until the parent consent exists (section 2.6). Consent covers children under 14 as required by Law 25; the same evidence record serves a COPPA style parental consent check for US families (BE-39). The notice text is versioned; a new version asks existing parents again (BE-39). Revocation equals deletion.

### 22.6 Access control and breach response
Admin reads of children are audited and reviewable. Role checks happen in the backend, not in the web app. Keep an incident register and notify the Commission d'accès à l'information and the people concerned when a breach carries a risk of serious harm (BE-48). Hosting is in Canada (Montreal region); the LLM provider receives no child identifier and no name.

## 23. Observability

- **Logs:** structured JSON, one line per request: `ts, level, request_id, trace_id, method, route (template), status, duration_ms, role, parent_id|child_id (uuid, no names), error_code`. Never log request bodies, emails, names, answers or tokens. Retention 30 days.
- **Metrics:** RED per route (rate, errors, p50/p95/p99 duration); active sessions; chapters started and completed; answer outcome mix; narrator first-byte latency, total time, fallback rate, leak-detector hit rate, model tokens and cost; engine generation time; webhook lag and failures; queue depth; login failures; rate-limit hits; push sent, failed, 410s.
- **Traces:** accept and propagate W3C `traceparent` (the proxy does not forward it yet, BE-47); spans for DB, engine, narrator, processor.
- **Alerts:** 5xx above 2 percent for 5 minutes; p95 above budget for 10 minutes; narrator fallback above 10 percent for 15 minutes; `/ready` failing; webhook errors; admin API 401 bursts; certificate expiry.
- **Dashboards:** one for kid play (starts, completion, fallback), one for billing (checkouts, failures, MRR), one for platform health.
- **Error tracking:** with scrubbers for email, names and tokens.
- **Uptime:** an external monitor calls `/health` every minute and runs `scripts/flows.mjs` hourly against staging.
- **Request id:** return `X-Request-Id` on every response and include it in problem bodies as `instance` or `request_id` when you can; the app does not show it yet.

## 24. Performance budgets

| Operation | p95 budget |
|-----------|-----------|
| `GET /health` | 100 ms |
| Simple reads (children, settings, worlds, engagement, subscription) | 300 ms |
| `GET /children/{childId}/home`, `journey`, `collection` | 400 ms |
| `GET /children/{childId}/feed` page | 500 ms |
| `POST /children/{childId}/sessions` | 800 ms |
| `POST /sessions/{sessionId}/beats` (question only; the scene streams later) | 800 ms |
| `POST /sessions/{sessionId}/beats/{beatId}/answer` | 400 ms |
| Narration first byte / last chunk | 1.5 s typical, 3 s max / 8 s max (then `fallback`) |
| `GET /sessions/{sessionId}/summary`, `GET /reports/weekly` | 600 ms |
| `POST /auth/login` | 500 ms |
| `GET /admin/v1/overview` | 1500 ms |
| Other admin reads | 500 ms |

Payloads: home 20 KB or less gzip, journey 10 KB or less, list pages 50 KB or less. Enable gzip or brotli. Capacity at launch: 200 concurrent kids and 20 narration streams per second; availability target 99.5 percent monthly. The web app reacts to a tap in under 100 ms on its own; do not add server round trips before showing the tapped state. The proxy's 15 s timeout is the hard ceiling for any call.

## 25. Environments and env vars

| Environment | Web | Backend | Notes |
|-------------|-----|---------|-------|
| Local | `pnpm dev` on :3000 | Go API on :8081 (`pnpm dev` starts it) | admin on :3100 against the Go API |
| Preview | Vercel preview per branch | staging Go API | `NEXT_PUBLIC_APP_ENV=preview` |
| Production | Vercel, region `yul1` | the production Go API | `NEXT_PUBLIC_APP_ENV=production` |

**Web app (`src/config/env.ts`)**

| Variable | Scope | Default | Meaning |
|----------|-------|---------|---------|
| `API_URL` | server | `http://localhost:8081/v1` | Backend base URL including `/v1`. |
| `NEXT_PUBLIC_APP_ENV` | public | `development` | `development`, `preview`, `production`. |
| `NEXT_PUBLIC_CARD_THRESHOLD_PCT` | public | 70 | 0 to 100. The real backend uses `PlatformConfig.card_threshold_pct`. |
| `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_LOCALES` | public | `fr-CA`, `fr-CA,en-CA` | Locales offered. |
| `NEXT_PUBLIC_FEATURE_FEED`, `NEXT_PUBLIC_FEATURE_KIOSK`, `NEXT_PUBLIC_FEATURE_TV`, `NEXT_PUBLIC_FEATURE_READ_ALOUD` | public | true | Feature switches in the UI. |
| `NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI`, `NEXT_PUBLIC_FEATURE_WELCOME_GIFT`, `NEXT_PUBLIC_SHOW_DEMO_BADGE` | public | false | Hide-by-default UI switches: the trial and subscription badge, card and links; the first-visit welcome gift (other gifts stay); the demo-data badge. They hide UI only, the server still enforces the subscription gate (BE-62, BE-63). |
| `NEXT_PUBLIC_SOUND_DEFAULT`, `NEXT_PUBLIC_ANALYTICS_ENABLED` | public | true | Defaults. No analytics sender is wired. |
| `NEXT_PUBLIC_MASCOT_ENABLED`, `NEXT_PUBLIC_MASCOT_KIND`, `NEXT_PUBLIC_MASCOT_EMOJI` | public | true, `owl`, 🦊 | Mascot. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | not in the schema yet | Needed for web push (M7). |
| `IMAGE_HOSTS` | build | empty | Hostnames allowed for remote images (`next.config.ts`, CSP). |
| `CONNECT_ORIGINS` | build | empty | Extra `connect-src` origins (normally none). |
| `VERCEL_REGIONS` | build | `yul1` | Function regions. |

**Admin app:** `ADMIN_PASSWORD` (min 8), `ADMIN_SESSION_SECRET` (min 32), `PLATFORM_API_URL` (platform base without `/admin/v1`), `ADMIN_API_TOKEN`. All server only.



**Backend (proposed names):** `DATABASE_URL`, `REDIS_URL`, `JWT_SIGNING_KEYS` (rotating set), `ACCESS_TTL_SECONDS` (3600), `REFRESH_TTL_DAYS` (30), `CHILD_TTL_SECONDS` (28800), `NARRATOR_PROVIDER` and key, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_GRACE_DAYS` (3), `EMAIL_PROVIDER` and key, `ADMIN_API_TOKEN`, `ADMIN_ORIGIN`, `SEED_DEMO_CHILDREN` (never true in production), `CSP_REPORT_ENABLED`. Secrets live in the platform secret store, never in the repo.

## 26. Seed and fixtures


**Demo platform data:** the demo parent `parent@example.com` (id `99999999-9999-4999-8999-999999999999`, name Camille Demo, locale fr-CA, trial of 14 days) owns Zoé and Max. The platform seed adds 39 more parents (8 trial, 18 active, 5 unpaid, 4 expired, 5 canceled; parents at positions 5, 11, 23, 31 blocked), 68 more children, 90 days of per-day activity and subscription history, 12 audit rows, and notifications for every third parent.

**Defaults to seed:** the platform config (section 11), the plan catalogue (section 3.8), the 8 worlds with hooks, the challenge catalogue (section 14), the skill catalogue.



## 27. Acceptance checklist

The backend passes when every item below passes. against a real backend, port the check names into the backend's own tests), "contract" is `bash scripts/test.sh contract`, "ui" is `node scripts/ui-checks.mjs`.

| # | Requirement | Test | Item |
|---|-------------|------|------|
| AC-01 | Every frontend call has an operation and every operation is documented | contract (all lines `ok`) | BE-49 |
| AC-02 | Register sets the parent cookie and the body has no token | flows "register" | BE-19 |
| AC-03 | Wrong password refused; wrong-password sentinel works in staging | flows, API test "wrong PIN is refused" for PIN | BE-19 |
| AC-04 | Child list, create with PIN, new child starts without consent | flows "create child", "new child starts without consent" | BE-19 |
| AC-05 | Wrong PIN gives 403 `invalid_pin`; own PIN gives a child cookie and no token in the body | flows "wrong PIN refused", "own PIN accepted..." | BE-19 |
| AC-06 | Play without consent gives 403 `consent_missing`; consent gives 204 and play works | flows "chapter refused without consent", "parent gives consent"; API test "no consent yet: play refused", "consent recorded" | BE-19 |
| AC-07 | A beat never carries the answer; 4 distinct choices including the answer and the misconception | flows "question without answer"; API test "beat never carries the answer", "beat has 4 distinct choices..." | BE-01 |
| AC-08 | Three outcomes are told apart and graded by the engine | API test "typical error, random error and correct are told apart", "wrong answers still return correct_answer for the engine" | BE-01 |
| AC-09 | A chapter ends after 3 answers with `chapter_complete`; early answers carry no rewards | API test "chapter ends after 3 answers...", "early answers carry no rewards..." | BE-21 |
| AC-10 | Card threshold: 3 of 3 earns a card; 2 of 3 at 70 does not; threshold 50 does; invalid header falls back to 70 | flows "2 of 3 right: chapter completes without a card"; API test threshold checks, "final answer carries score..." | BE-22 |
| AC-11 | Score object on answer and summary | API test "score shows 2/3, 66.7, card_awarded false" | BE-22 |
| AC-12 | Idempotent beat and answer: same beat returned, second answer gives 409 `beat_answered` | API test "open beat requested again returns the same beat (200)", "answering a beat twice gives 409 beat_answered" | BE-02 |
| AC-13 | Unknown beat or session gives 404; beat after completion gives 409 `session_completed` | API test "unknown beat gives 404", "unknown session gives 404", "beat after completion gives 409 session_completed" | BE-03 |
| AC-14 | Narration streams `scene` events then `done`; denouement before answering gives 409; chunks about 4 words | API test "scene streams as scene events then done", "denouement before the answer is refused (409)", "chunks are about 4 words" | BE-04 |
| AC-15 | Narration `fallback` event and slow stream behave as specified | API test "narration-fallback sends a fallback event", "narration-slow holds the stream back"; ui error checks | BE-04 |
| AC-16 | Narration text gates: lengths, no math symbols, no em dash, language | API test "scene is 25-60 words...", "no + − × ÷ = in scene narration", "no em dash in scenes", "denouement is 15-45 words" | BE-05 |
| AC-17 | Pause, resume, finish, summary with stuck points | API test "pause", "resume", "finish", "summary: ..." | BE-21 |
| AC-18 | Injected failures return the right status and problem body | API test "rate-limited gives 429...", "unauthorized gives 401...", "server-error gives 500...", "daily-limit gives 403..." | BE-03 |
| AC-19 | Feed: 20 items per page, endless, no repeats, AI labelled, puzzle never leaks, graded by the engine, reaction stored | API test feed checks, "puzzle answer is graded", "reaction stored" | BE-18 |
| AC-20 | Profiles are real state: create, list, delete, nine profiles refused | API test "new child is listed with the others", "deleted child disappears", "a ninth profile is refused" | BE-19 |
| AC-21 | Trial parent can start a chapter; plans, checkout (+30 days), cancel keeps access | API test "register creates a trial parent", "plans: free 0, monthly 899...", "checkout activates...", "cancel keeps access..." | BE-24 |
| AC-22 | Unpaid gives 402 with i18n; blocked gives 403; policy allow lets play; paid works again | flows "unpaid parent: Play is refused...", "blocked parent..."; API test "unpaid: 402 subscription_inactive with i18n copy", "policy allow lets an unpaid family play" | BE-24 |
| AC-23 | Platform public exposes policy and threshold | API test "platform public exposes policy and threshold" | BE-25 |
| AC-24 | Notifications: broadcast reaches the right parent in the right language, mark read works | API test "broadcast reaches one targeted parent", "parent receives the broadcast in the right language", "mark read works" | BE-25 |
| AC-25 | Admin refuses missing and wrong tokens; CORS only for `ADMIN_ORIGIN` | API test "admin refused without token", "admin refused with a wrong token", "CORS: ..." | BE-23 |
| AC-26 | Admin parents are paged, searchable, filterable; block, unblock, mark paid or unpaid, extend, delete | API test "parents are paged" ... "admin deletes a parent" | BE-23 |
| AC-27 | Admin overview figures are consistent (sums, series lengths, MRR) | API test "overview counts parents...", "overview subscription_mix sums...", "overview kids_by_grade sums...", "overview plan_mix mrr equals...", "overview day series...", "overview month series..." | BE-23 |
| AC-28 | Every admin mutation and child read is audited | API test "audit grew with every mutation", "child reads are audited", "audit entries carry actor, action and target" | BE-27 |
| AC-29 | `kid_can_change_language` round trip parent to kid and admin to kid | API test "settings default kid_can_change_language true", "parent turns kid_can_change_language off", "admin turns it back on and the kid app sees it" | BE-28 |
| AC-30 | Admin plan edits reach parents | API test "admin edits plan prices, parents see them" | BE-23 |
| AC-31 | The kid shell, home, feed, worlds, collection, me render for a logged-in child | flows "page /play/home" and the other pages | BE-21 |
| AC-32 | Delete child removes it from the list | flows "delete child", "deleted child is gone" | BE-19 |
| AC-33 | Error screens: API failure, offline, never-answering endpoint show the right message | `bash scripts/test.sh errors` | BE-03 |
| AC-34 | Journey, home, engagement, growth, collection, progress reflect real plays | ui checks (kid chapter, map checks) | BE-21 |
| AC-35 | Webhook signature rejects bad signatures and replays; checkout is idempotent | backend unit tests (not in this repo) | BE-32 |
| AC-36 | Push subscribe upsert, 410 cleanup, payload shape | backend unit tests; `scripts/check-reminders.mjs` for the local rules | BE-26 |
| AC-37 | Rate limits return 429 with `retry_after_seconds` | backend tests; API test "rate-limited gives 429 on a domain route" for the shape | BE-40 |
| AC-38 | Export is complete and delete cascades | backend tests against section 22 | BE-37 |
| AC-39 | `/health` under 100 ms, `/ready` truthful | monitor and `GET /api/health` | BE-14 |
| AC-40 | Latency budgets met on staging | load test against section 24 | BE-50 |

## 28. Migration switch checklist

Steps:
1. Backend staging is up; `GET /health` is `ok`; `API_URL` of a preview deployment points to it .
2. Run `bash scripts/test.sh contract`: all lines `ok`.
3. Run `node scripts/flows.mjs <preview url>` with `SEED_DEMO_CHILDREN=true` on staging; every line `ok`. The subscription gate block of the script runs only against `localhost`; test it with the backend's own tests (AC-22).
4. Run the UI and error checks against the preview: `bash scripts/test.sh ui` and `bash scripts/test.sh errors` with `BASE_URL` set.
5. Verify the P0 items of `BACKEND_REQUIREMENTS.md`.
6. Confirm secrets are in the store.
7. On a preview, play a chapter and check the eleven reads of section 15 change with the plays (AC-34).
8. Admin: set `PLATFORM_API_URL` to the real platform, `ADMIN_ORIGIN` on the platform to the admin app origin, rotate `ADMIN_API_TOKEN` and `ADMIN_PASSWORD`.
9. Payments: processor live keys, webhook endpoint and secret, a test card run, tax settings, then `features.payments` true.
10. Push: VAPID keys, set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `features.push` true.
11. Launch review: audit entries visible, logs free of personal data, backups restore tested, alerts firing in staging.

## 29. Known mismatches

The contract wins. owners fix these.

| ID | Where | Mismatch | Impact | Owner | Item |
|----|-------|----------|--------|-------|------|
| M1 | `src/data/hooks/platform.ts` `usePlans`, `ManageSubscription` `PlanCard` | The app expects an array or `{items}` and a field `price_cad` in dollars. The API answers `{currency, plans[], methods[]}` with `price_cad_cents`. `items()` returns `undefined`, so the plans query fails and no price shows. | Subscription screen broken against any backend that follows the contract | frontend | BE-24 |
| M2 | `src/data/api/platform-types.ts` | Hand-written `Plan`, `Subscription`, `CheckoutResult`, `PlatformPublic`, `ServerNotification` duplicate generated types and differ (M1). | Drift | frontend | BE-49 |
| M3 | `src/app/api/v1/[...path]/route.ts`, `messages.*.json` | No `Origin` check yet (S1) and no message key for `forbidden_origin`. | CSRF defence relies on SameSite only | frontend | BE-30 |
| M4 | `ErrorBridge.tsx`, `ui/error-screen/classify.ts`, `StoryScreen.tsx` `KNOWN`, `client.ts` `ErrorCode` | `subscription_inactive`, `account_blocked`, `forbidden_origin`, `beat_not_answered` are not in the known sets, so any screen other than the Play dialog shows them as `unknown`. | Generic text for a precise problem | frontend | BE-03 |
| M5 | `signOut()` in `hooks.ts` | Sign out clears cookies only and never calls the backend. | Refresh token stays valid until it expires | frontend + backend | BE-31 |
| M6 | `NEXT_PUBLIC_ANALYTICS_ENABLED` | The flag exists, nothing sends `POST /events`. | No product analytics | frontend | BE-53 |
| M7 | `EnableNotificationsPrompt`, `src/config/env.ts` | No env var carries the VAPID public key and no caller passes `vapidPublicKey`, so subscribing ends with `no_key`. | Web push cannot work | frontend | BE-26 |
| M8 | `useCheckout` | No `Idempotency-Key` on checkout. | Double click can open two checkouts | frontend | BE-32 |
| M10 | `AuthForm`, `ParentGate` | The parent email is kept in `localStorage` (`nx:parent-email`) for the parent gate. | Personal data at rest on the device | frontend | CR-7 |
| M11 | `ErrorBridge` | A 401 on a child call offers "log in" to `/parent/login`; the child token has no refresh. | A child can be thrown out mid-play after the token ends | frontend | BE-31 |
| M12 | `useNotifications`, `reminders.ts` | Local reminders and server `play_reminder` / `time_limit` have different ids and are not deduped. | Duplicate bell entries | frontend + backend | BE-26 |
| M16 | proxy | Only `content-type` and `cache-control` reach the browser; `Retry-After`, `X-Request-Id` are dropped and `traceparent` is not forwarded. | 429 delay and trace ids lost | frontend | BE-47 |
| M17 | proxy | A 15 s total timeout also cuts SSE bodies. | A slow narrator must fall back by 8 s | backend | BE-04 |
| M18 | `openapi.yaml` | Operations the frontend does not call today: `getChild`, `listSkills`, `getReviewCalendar`, `sendEvents`, `logoutParent`, `unsubscribePush`, `ready`, `getAccount`, `updateAccount`, `deleteAccount`. Challenges and gift are not called either (local, BE-20). | Dead until used; kept for the target design | frontend | BE-20 |
| M22 | `StoryScreen`, `DoneScreen` | Rewards and score for the done screen live in `sessionStorage` (`nx:rewards:<sessionId>`) and vanish on reload. The contract recommends `Session.score` on completed sessions. | Done screen empty after a reload | frontend | BE-22 |
| M23 | `AccountScreen`, `MeScreen` | The language choice sets the `NEXT_LOCALE` cookie only; the parent's stored `locale` (used for notification and email text) never changes. `PATCH /account` exists for it. | Notifications in the wrong language | frontend | BE-55 |

## 30. Review log

The list of backend needs was reviewed three times. Each pass lists what it added.

### Pass 1: inventory script

Command: `node scripts/api-inventory.mjs` (also `bash scripts/test.sh contract`). It scans `src/**` and `admin/src/**` for `api.GET/POST/PUT/PATCH/DELETE(...)`, `call(...)` in `platform-hooks.ts`, `fetch('/api/...')` (including the narration stream and the app routes), and the calls the proxy and the health route make to the backend. It compares them with both OpenAPI files and with this guide, then checks that the guide names every error code, game event, cookie, environment variable and header the code uses, and that every `BE-` and `CR-` row has an owner, a priority, a test and a valid guide link.

Result before the contract work: 1 frontend call without an operation (`POST /push/subscribe`), and no OpenAPI file at all for the 16 admin operations the admin app calls. Result after: 59 frontend calls matched (43 kid and parent, 16 admin), 72 operations described in the guide, 0 failures, 13 operations not called by the frontend today (listed as `info`, section 29 item M18).

Added by pass 1:
- `contracts/openapi.admin.yaml` with the 16 admin operations.
- `subscribePush` and `unsubscribePush` operations and the `PushSubscription` schema.
- First guide draft run: 34 failures. 28 came from the admin paths missing the `/admin/v1` prefix in the checker, 6 from environment variables written in short form (`_KIND`, `_EMOJI`, `_SRC`, `_KIOSK`, `_TV`, `_READ_ALOUD`); the guide now names every variable in full.
- Standard 401, 403, 429 and 500 responses on every operation, `Accept-Language` on every localized operation, `Score` on `Session`, `CheckoutResult`, `Challenge`, `Account`, `PushSubscription`, `/ready`, problem `i18n` and `retry_after_seconds`.
- New requirement rows BE-29 to BE-54.

### Pass 2: screen by screen

For each screen: network calls, then stored values on the device.

| Screen | Network calls | Stored values |
|--------|---------------|---------------|
| Welcome `/` | `GET /api/session` | none |
| Picker `/play` | `GET /api/session`, `GET /children` (parent token), `POST /children/{childId}/token` | `nx:child:<id>:profile` (first name, avatar); cookies `nx_child`, `nx_child_id` |
| Home `/play/home` | `GET /api/session`, `GET /children/{childId}/home`, `GET /children/{childId}/settings`, `POST /children/{childId}/sessions` on Play | `nx:onboarding:<id>`, session flags `nx:greet:seen`, `nx:greet:spoken` |
| Feed `/play/feed` | `GET /children/{childId}/feed`, `PUT .../feed/{itemId}/reaction`, `POST .../feed/{itemId}/answer`, `POST .../sessions` from a call to action | none |
| Worlds `/play/worlds` | `GET /worlds` | service worker data cache |
| Journey `/play/journey/[world]` | `GET /worlds`, `GET /children/{childId}/journey`, `POST .../sessions` | - |
| Story `/play/session/[id]` | `GET /sessions/{sessionId}`, `POST /sessions/{sessionId}/resume`, `POST .../beats`, `GET .../narration?phase=scene`, `POST .../answer`, `GET .../narration?phase=denouement`, `POST .../pause`, `POST .../finish`, `GET /children/{childId}/settings` | `nx:rewards:<sessionId>` (sessionStorage), game log events `start`, `answer`, `card`, `finish` |
| Done `/play/session/[id]/done` | `GET /sessions/{sessionId}`, `GET /children/{childId}/engagement`, `POST .../sessions` for the next chapter | reads `nx:rewards:<sessionId>` |
| Quest `/play/quest` | `GET /children/{childId}/quests/daily`, `GET .../home`, `POST .../sessions` (`daily_quest`) | - |
| Challenges `/play/challenges` | `GET /children/{childId}/challenges`, `POST .../challenges/{challengeId}/accept` | none |
| Collection `/play/collection` | `GET /children/{childId}/collection` | - |
| Me `/play/me` | `GET .../settings`, `GET .../engagement`, `GET .../growth`, `DELETE /api/session?scope=child` | `NEXT_LOCALE` cookie, `nx:prefs:v1` (sound, voices) |
| Parent login and register | `POST /auth/login`, `POST /auth/register` | `nx:parent-email` (localStorage), cookies `nx_parent`, `nx_refresh` |
| Parent home `/parent` | `GET /children`, `POST .../token` (Play), `GET /subscription`, `GET /notifications` (60 s poll), `POST /notifications/{id}/read`, `POST /push/subscribe` (prompt) | `nx:notified`, `nx:notify-prompt-dismissed` |
| Child form `/parent/children/new` | `POST /children` (sends the browser time zone) | none |
| Consent `/parent/children/[id]/consent` | `POST /auth/consent` (version `2026-10`) | none |
| Overview `/parent/children/[id]` | `GET .../growth`, `GET .../progress`, `GET .../sessions`, `GET .../challenges`, `POST .../token` (Play) | none |
| Settings `/parent/children/[id]/settings` | `GET` and `PUT .../settings`, `GET .../export`, `DELETE /children/{childId}`, `GET /children` | none |
| Recap `/parent/children/[id]/sessions/[sid]` | `GET /sessions/{sessionId}/summary` | none |
| Report `/parent/children/[id]/report` | `GET /reports/weekly` | none |
| Subscription `/parent/subscription` | `GET /subscription`, `GET /subscription/plans`, `POST /subscription/checkout`, `POST /subscription/cancel` | none |
| Account `/parent/account` | none | `NEXT_LOCALE`, `nx_theme`, `nx_motion`, `nx_display`; "reset guide" removes `nx:onboarding:*` |
| Parent gate (leaving child mode) | `POST /auth/login` | reads `nx:parent-email` |
| Admin login | admin app `POST /api/auth/login` | cookie `nx_admin` |
| Admin overview | `GET /admin/v1/overview` | none |
| Admin parents | `GET /admin/v1/parents`, `PATCH /admin/v1/parents/{parentId}` (bulk paid or unpaid) | filters in memory |
| Admin parent detail | `GET /admin/v1/parents/{parentId}`, `PATCH`, `DELETE`, `GET /admin/v1/notifications?page_size=100` | none |
| Admin children | `GET /admin/v1/children` | filters in memory |
| Admin child detail | `GET /admin/v1/children/{childId}`, `GET .../activity`, `PATCH` | none |
| Admin plans | `GET` and `PUT /admin/v1/subscriptions/plans` | none |
| Admin config | `GET` and `PUT /admin/v1/config` | none |
| Admin notifications | `GET /admin/v1/notifications`, `POST /admin/v1/notifications/broadcast` | none |
| Admin audit | `GET /admin/v1/audit` | none |
| Any screen after a failure | `GET /api/health` | none |

Added by pass 2:
1. Device model: the kid door needs the parent cookies to list profiles (section 2.5).
2. `Engagement.minutes_today` and `last_played_at`, because the kid home reads them from the empty device log in api mode (M21).
3. `Session.score` recommended on every session after one answer, because the done screen loses its rewards on reload (M22).
4. `ChildUpdate.timezone` (families travel), and `onboarding_completed: false` to replay the tour.
5. `GET`, `PATCH` and `DELETE /account` plus M23 and BE-55: the language choice never reaches the backend.
6. `consent_missing` also on token creation (the picker handles it), M24.
7. Plans response shape bug in the web app (M1) and the checkout response shape.
8. Cookie table with exact flags, including that `nx_child_id` is readable by scripts on purpose, and the 15 second proxy timeout that bounds SSE (M17).
9. Complete list of device-stored keys and which survive sign out (section 15).
10. Server kinds of notification versus the local reminders (M12).

### Pass 3: product prompt hard rules (`docs/PRODUCT_PROMPT.md`)

| Rule | Backend consequence | Where |
|------|--------------------|-------|
| 1. No silent errors | Every failure has a code and kind text; narration `fallback` is never silent; background jobs (email, push, webhook) retry, log and alert; `payment_due` precedes a billing block. | sections 4, 7, 23 |
| 2. Storybook-only components | No backend effect. Copy rules are checked by `scripts/check-copy.mjs`. | section 21 |
| 3. Event-driven motion and completion feedback | The answer returns every reward the app celebrates (`chapter_complete`, `card_earned`, `skill_mastered`, `streak_extended`, `daily_goal_met`); challenge completions also come back as `card_earned` on the action that completed them (chapter answer, like, puzzle). | sections 3.5, 3.6, 14 |
| 4. Game-style onboarding | `onboarding` session kind, `onboarding_completed` per child, replay by setting it to false. | sections 3.2, 13 |
| 5. Sound feedback | `sound` and `read_aloud` settings with defaults; narration written for read-aloud. | sections 3.2, 21 |
| 6. Device language is the default | `Accept-Language` from the device, never inferred from the IP, every string in both languages. | sections 18, 21 |
| 7. Clear, high-impact animation | Budgets leave the app free to react in under 100 ms; no server round trip before the tapped state. | section 24 |
| 8. Social-feed scrolling | Endless cursor feed, page size 5, never repeats within 40 items. | sections 3.6, 6 |
| 9. No AI-style wording or em dashes | Content gates on narration, notifications, errors, plan texts and admin-entered public text (reject an em dash with 422). | sections 7, 21 |
| Playful and professional | No hearts, XP, leagues, timers, ranks or comparisons in any response. | section 21 |
| i18n from day one | Same ids in both languages, notification language follows the parent's stored locale (`PATCH /account`). | sections 3.1, 21 |
| PWA-first, offline | Cached endpoints (`worlds`, `journey`, `collection`, `home`, `engagement`, `growth`) must be safe to store on the device and are cleared at sign out. Push for background reminders. | sections 9, 18 |
| TV, kiosk and shared devices | Long child token (8 h), PIN per profile, profile change clears child cookies only. | section 2 |
| Performance | Latency and payload budgets. | section 24 |

Added by pass 3:
1. `rewards` on the feed reaction and puzzle answer responses, so challenge completions can be celebrated from the response.
2. Rule 7 of the error rules (no silent server failure).
3. Content rules: forbidden fields list, admin-entered text held to the em dash rule, language never inferred from IP.
4. Onboarding replay through the existing `PATCH` field.
5. Statement that cached endpoints must be safe to store on the device.

## 25. Questions, how-to pictures and reuse (Go backend)

Full design: [`docs/BACKEND_GO.md`](../docs/BACKEND_GO.md). The rules the backend must keep:

- The engine alone makes questions, choices, grading and the typical-mistake code. The LLM only writes the scene (without the answer) and the ending (with the verdict), and every text is leak-checked (BE-56, BE-60).
- Each generated question is stored once and reused for other children. One child never gets the same question twice, and after a wrong answer the next beat differs in numbers and shape (BE-57, BE-58).
- `AnswerResult.method_visual` carries a declarative picture (`MethodVisual`: `kind`, integer `params`, `steps`, `alt`, `cache_key`) for right and wrong answers, in the request language. New kinds are additive and unknown kinds are skipped by the client (BE-59, BE-61).
- The web app hides the subscription UI, the welcome gift and the demo badge unless the matching `NEXT_PUBLIC_*` switch is on. While billing is off the platform `unpaid_policy` is `allow` (BE-62). The welcome card is granted once (BE-63).
