# Regression index

Every defect gets a test that fails before the fix and passes after. All tests below run in `bash scripts/test.sh all` (mode `qa` runs only them) and in the CI job `suite` (`.github/workflows/ci.yml`); Go tests run in `go test ./...`. A defect is closed only when its row exists here, the test is in the always-run set and it is green on the integrated branch. Verified 2026-10-20 on release/candidate 01aaff8 + api 0e2bd4c.

| Defect | Test | Route / endpoint | Added | State |
|---|---|---|---|---|
| QA-A-001 feedback sheet covers question (scrolled check) | `scripts/qa/regress-ui.mjs` | /play/session/[id], 7 viewports x 4 worlds | 2026-10-19 | closed, 28/28 pass |
| QA-A-008 feedback sheet hides the question tail on a phone, unscrolled | `scripts/qa/regress-strict.mjs` | /play/session/[id], 20 worlds x 5 viewports | 2026-10-20 | closed (84 of 84 runnable pass; toast P2) |
| QA-A-002 emoji art in kid screens | `scripts/qa/sweep.mjs` kind `emoji` | all routes | 2026-10-19 | closed, 0 hits |
| QA-A-003 flat vector illustrations (Numa `[data-mascot]` and tour overlay exempt) | `scripts/qa/sweep.mjs` kinds `flat-vector-svg`, `svg-image-art` | all routes | 2026-10-19 | closed, 0 hits |
| QA-A-004 heavy button borders (>= 2 px) | `scripts/qa/sweep.mjs` kind `heavy-button-border` | all routes | 2026-10-19 | closed, 0 hits |
| QA-A-005/006 axe serious and critical | `scripts/qa/sweep.mjs` kinds `axe-*` (axe-core 4.10.2) | all routes | 2026-10-19 | closed; moderate items are P2 |
| QA-A-007 console errors (the 404 page's own HTTP 404 is expected, any other 404 fails) | `scripts/qa/sweep.mjs` kinds `console-error`, `request-failed` | all routes | 2026-10-19 | closed |
| QA-C-001 sprites as question art, uncredited assets | `scripts/qa/bank-audit.mjs` | seed/questions, seed/assets/credits.json | 2026-10-19 | closed, 202 assets credited |
| QA-C-002 alt text, media gaps | `scripts/qa/bank-audit.mjs` (P2) | seed | 2026-10-19 | closed for alt text |
| QA-BE-001 2 MB password accepted | `scripts/qa/api-fuzz.mjs`; Go `TestQASizeCaps` | POST /v1/auth/register | 2026-10-19 | closed |
| QA-BE-002 422 before 401 / wrong role before validation | `scripts/qa/api-fuzz.mjs`; Go `TestQAAuthBeforeValidationEveryOperation`, `TestQAWrongRoleBeforeValidation` | every operation | 2026-10-19 | closed |
| QA-BE-003 idempotent replay returns 429 | `scripts/qa/api-fuzz.mjs`; Go `TestQAIdempotentReplayBypassesRateLimit`, `TestQAAnswerReplayBypassesRateLimit` | POST sessions, POST answer | 2026-10-19 | closed |
| QA-BE-004 prerequisite-locked chapter starts with explicit skill_id | `scripts/qa/extra.mjs` "quest locks" | POST /v1/children/{id}/sessions | 2026-10-20 | closed, 0 of 98 locked nodes start |
| QA-BE-005 passkey registration fails with a virtual authenticator | `scripts/qa/extra.mjs` "passkey registers" | /parent/account | 2026-10-20 | closed |
| i18n leakage fr/en on every route, logout, credits links | `scripts/qa/extra.mjs` | all routes | 2026-10-20 | passing |
| QA-W-001 JS budget | `scripts/qa/sweep.mjs` kind `js-bytes` (P2, reported) | all routes | 2026-10-19 | reduced (zod out of client bundles), still above 600 KB; reported |
| P2 voice toast over keypad | `scripts/qa/regress-strict.mjs` toast check | /play/session/[id] | 2026-10-20 | closed (toasts now at the top) |
| P2 axe moderate: heading-order, landmark-one-main, region | `scripts/qa/sweep.mjs` kinds `axe-*` | play and parent routes, 404, offline | 2026-10-19 | closed on fix/qa-round2 |
| P2 CLS above 0.1 on parent and play-me pages | `scripts/qa/sweep.mjs` kind `cls` | parent-*, play-me | 2026-10-19 | mostly closed, see QA_REPORT.md |

| QA-BE-006 home suggested skill is locked, Play button dead | `scripts/qa/extra.mjs` "home suggestion starts", "daily quest starts" | GET /v1/children/{id}/home, POST sessions | 2026-10-20 | OPEN (P0) |
| QA-A-009 flat vector welcome gift | sweep state with unclaimed gift (to add) | /play/home first run | 2026-10-20 | OPEN (P1), test pending |
| QA-A-010 every nav tab and internal link opens, fr and en, 360 and 1280 | `scripts/qa/linkcheck.mjs` | all routes | 2026-10-20 | passing, 188 checks |

Rule for new defects: add the check to `scripts/qa/*` first, see it fail, then hand to the owner.
