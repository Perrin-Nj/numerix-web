# QA report (living)

Round 1, 2026-10-19. Target: working tree of `feat/human-visuals` (no builder commits yet, equals main 2a45d05 plus uncommitted edits), web build on :3130, API on :8130, scratch DB `scripts/qa/out/qa.db` seeded with all 1229 questions.
Rule: a defect is CLOSED only when its regression test exists, is in the always-run set (`bash scripts/test.sh all`, CI job `suite`) and is listed in `docs/REGRESSION_INDEX.md`.

Evidence root: `scripts/qa/out/` (sweep.json, shots/{m360,t768,d1280}/*.png, contact-*.png, sprites.png, bank.txt, load1.log, load2.log, gotest.log). Re-run: `node scripts/qa/stack.mjs`, `node scripts/qa/sweep.mjs`, `node scripts/qa/analyze.mjs`.

## Green
- `go test -count=3 ./...`: 1098 passed, 20 packages.
- Load 50 rps x 30 s, twice, fresh seeded DB: answer p95 4.4 / 3.2 ms, beats 13.7 / 18.2 ms, start 2.6 / 1.7 ms, health 2.1 / 4.2 ms, 0 x 5xx, 0 x 429.
- API fuzz: 141 calls, 0 x 5xx, auth boundaries (no token, garbage token, child vs parent token, other family) all correct, login brute force and register per-IP limits return 429.
- Bank mechanical audit, 1229 questions: 0 wrong answers, 0 distractor = answer, 0 missing fr/en, 0 leaks.

## Defects

| Id | Sev | Owner | Title | Repro / evidence | Regression test |
|---|---|---|---|---|---|
| QA-A-001 | P0 | A | Feedback sheet covers the question and the answers after answering | Any chapter, answer once. 12/12 cases overlap (360, 768, 1280 x nature, espace, cuisine, sport). Owner reported it too. `node scripts/qa/regress-ui.mjs` | regress-ui.mjs (fails now) |
| QA-A-002 | P1 | A | Emoji used as content and icons in kid screens | Challenges/parent child page icons (sun, target, feet, heart, books, puzzle, compass), feed avatars (fox, owl), feed item emoji (soccer, tomato, runner, builder, carrot, onion, cook, astronaut), home squirrel. `shots/m360/play-feed.png`, `play-home.png`, `play-challenges.png` | sweep.mjs kind `emoji` (fails now) |
| QA-A-003 | P1 | A | Flat vector illustrations remain | Inline SVG art >= 80 px: home 152x161 (`shots/m360/home.png`, also offline, 404), play-home "Ton histoire" 96 px and daily goal ring 112 px, play-feed cards "La porte à chiffres", "La tour qui comptait à l'envers", "Le casse-tête de Lumi", "Trois d'affilée", "Zéro, le pousseur" (292x164) | sweep.mjs kind `flat-vector-svg` (fails now) |
| QA-A-004 | P1 | A | Heavy button borders | 4 px avatar picker buttons (`parent-child-new`), 2 px on world tiles (`play-worlds`, `play-home`), feed Garder/J'aime and answer buttons, theme toggle, play-me settings, parent buttons (Ajouter un enfant, Gérer l'abonnement, Je suis un adulte), tour popover. 400+ hits | sweep.mjs kind `heavy-button-border` (fails now) |
| QA-A-005 | P1 | A | axe serious: aria-prohibited-attr on decorative wrappers | `.pointer-events-none` on 51 page loads, `.inset-x-0` home, `.z-[60]` play-home/worlds/feed | sweep.mjs `axe-*` |
| QA-A-006 | P1 | A | axe critical: aria-allowed-attr on `#driver-dummy-element` (tour) and color-contrast on home subtitle | play-home, home | sweep.mjs `axe-*` |
| QA-A-007 | P1 | A | console error "Failed to load resource 404" on /404 and /parent/login | `shots/m360/404.png`; find the missing asset (likely icon/manifest) | sweep.mjs `console-error` |
| QA-C-001 | P1 | content | 54 questions show a Fluent-style 3D emoji sprite (role `object`, cow, pig, carrot, rocket, whale, owl...) instead of a photo; 52 of them are absent from `seed/assets/credits.json` so no licence or attribution is served | `scripts/qa/out/sprites.png`, `node scripts/qa/bank-audit.mjs` | bank-audit.mjs asset check (P1, fails now) |
| QA-C-002 | P2 | content | No fr/en alt text in the credits data for any of the 118 credited photos; 423 of 1229 questions have no media at all | bank-audit.mjs | bank-audit.mjs (P2 reported, not failing) |
| QA-BE-001 | P1 | backend | `POST /auth/register` accepts a 2 MB password (201): no password or body size cap, argon2 on a 2 MB input is a cheap DoS | `node scripts/qa/api-fuzz.mjs` check "2MB body refused" | api-fuzz.mjs (fails now) |
| QA-BE-002 | P2 | backend | Validation runs before auth: `POST /children/{id}/sessions` with no token and `{}` body returns 422, expected 401 | api-fuzz.mjs "no token POST" | api-fuzz.mjs (fails now) |
| QA-BE-003 | P2 | backend | Replaying `POST /children/{id}/sessions` with the same Idempotency-Key returns 429 once the per-child limiter trips instead of the stored result | api-fuzz.mjs "idempotent replay" | api-fuzz.mjs (fails now) |
| QA-W-001 | P2 | A/B | JS per route 0.8 to 1.6 MB decompressed (budget 600 KB): home 1.6 MB, parent 1.1 MB, play-me 1.1 MB | sweep.json `js` | sweep.mjs `js-bytes` (P2, reported) |

Sweep totals on the current tree: 63 page loads (21 routes x 3 viewports), P0 0, P1 607, P2 482 (mostly emoji, border and axe repeats, counted per viewport). No horizontal scroll, no broken image, no failed request, no 5xx found.

## Not yet covered (honest gaps)
- 60-question hand re-solve: sample printed in `scripts/qa/out/bank.txt`, not yet judged (mechanical checks only).
- Not automated yet: offline/retry, 401 recovery, passkey panel, fr/en switch on every route, all 12 UI question kinds (existing `play-checks.mjs` covers kinds; run it via `test.sh play`), feed 200 items and infinite scroll (no feed branch committed yet), quest lock states in UI.
- Builder branches: `feat/media-feed` does not exist yet; `feat/human-visuals` has no commits. Re-run on `release/candidate` from a clean checkout.
- Test runs share one working tree with the builders, so a build may mix states; the final run must come from a clean checkout.
