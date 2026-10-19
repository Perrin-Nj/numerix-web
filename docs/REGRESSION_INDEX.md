# Regression index

Every defect gets a test that fails before the fix and passes after. All tests below run in `bash scripts/test.sh all` (mode `qa` runs only them) and in the CI job `suite` (`.github/workflows/ci.yml`). A defect is closed only when its row exists here and the test is green on the integrated branch.

| Defect | Test | Route / endpoint | Added | State |
|---|---|---|---|---|
| QA-A-001 feedback sheet covers question | `scripts/qa/regress-ui.mjs` | /play/session/[id], 3 viewports x 4 worlds | 2026-10-19 | failing (open) |
| QA-A-002 emoji art in kid screens | `scripts/qa/sweep.mjs` kind `emoji` | all routes | 2026-10-19 | failing (open) |
| QA-A-003 flat vector illustrations | `scripts/qa/sweep.mjs` kind `flat-vector-svg`, `svg-image-art` | all routes | 2026-10-19 | failing (open) |
| QA-A-004 heavy button borders (>= 2 px) | `scripts/qa/sweep.mjs` kind `heavy-button-border` | all routes | 2026-10-19 | failing (open) |
| QA-A-005/006 axe violations | `scripts/qa/sweep.mjs` kinds `axe-*` (axe-core 4.10.2) | all routes | 2026-10-19 | failing (open) |
| QA-A-007 console errors | `scripts/qa/sweep.mjs` kind `console-error` | /does-not-exist, /parent/login | 2026-10-19 | failing (open) |
| QA-C-001 sprites as question art, uncredited assets | `scripts/qa/bank-audit.mjs` | seed/questions, seed/assets/credits.json | 2026-10-19 | failing (open) |
| QA-C-002 alt text, media gaps | `scripts/qa/bank-audit.mjs` (P2, reported) | seed | 2026-10-19 | reported |
| QA-BE-001 2 MB password accepted | `scripts/qa/api-fuzz.mjs` | POST /v1/auth/register | 2026-10-19 | failing (open) |
| QA-BE-002 422 before 401 | `scripts/qa/api-fuzz.mjs` | POST /v1/children/{id}/sessions | 2026-10-19 | failing (open) |
| QA-BE-003 idempotent replay 429 | `scripts/qa/api-fuzz.mjs` | POST /v1/children/{id}/sessions | 2026-10-19 | failing (open) |
| QA-W-001 JS budget | `scripts/qa/sweep.mjs` kind `js-bytes` (P2, reported) | all routes | 2026-10-19 | reported |

Rule for new defects: add the check to `scripts/qa/*` first, see it fail, then hand to the owner.
