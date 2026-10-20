# QA report (living)

Round 2, 2026-10-20. NOT SIGNED OFF (see Open). Target: clean checkout of `release/candidate` (01aaff8) + numerix-api main (0e2bd4c), built and seeded fresh (1229 questions, 202 assets, 200 feed items), own ports 18140 (API) and 13140 (web), `QA_FRESH=1` refuses a busy port. Branch with the round-2 harness changes: `qa/round2` (bdd121e and later) in the QA worktree.
Rule: a defect is CLOSED only when its regression test exists, is in the always-run set (`bash scripts/test.sh all`, CI job `suite`) and is listed in `docs/REGRESSION_INDEX.md`.

## Run results (candidate)
| Suite | Result |
|---|---|
| `pnpm check` | 0 errors (4 unused-import warnings in scripts/qa) |
| `go test -count=3 ./...` | 1446 passed, 22 packages |
| seed `--validate-only`, feedseed `--validate-only` | valid: 20 worlds, 89 quests, 1229 questions, 202 assets; 200 feed items |
| test.sh all: contract, state, flows, ui, errors, mobile, feed | all pass |
| test.sh play (every question kind, credits) and images | all pass |
| bank-audit | 0 P0/P1; 4 questions with only 2 distractors (P2) |
| api-fuzz (141 calls) | all pass, 0 x 5xx |
| sweep, 63 page loads (21 routes x 3 viewports), axe-core 4.10.2 | P0 0, P1 0, P2 only (see below) |
| regress-ui QA-A-001 (7 viewports x 4 worlds) | 28/28 pass |
| load 50 rps x 30 s, twice, fresh seeded DB | answer p95 1.7 / 1.7 ms, beats 3.7 / 3.7 ms, start 1.7 / 1.7 ms, health 0 ms; 0 x 5xx, 0 x 429 |
| extra: fr/en on every route, logout, credits links, panel | pass except the two items below |

## Open
| Id | Sev | Owner | Title | Repro | Test |
|---|---|---|---|---|---|
| QA-A-008 | P1 | A | Feedback sheet still hides the tail of the question on a 360x740 phone without scrolling (about 15% of questions: sport, dinosaurs, robots; earlier ocean, pirates). QA-A-001 passes only because its check scrolls to the bottom first. Owner's original bug, reduced but not gone | `node scripts/qa/regress-strict.mjs <base>`: 3 of 20 cases fail. Screenshots `scripts/qa/out/review/m360-feedback-ocean.png`, `-pirates.png` | regress-strict.mjs (fails) |
| QA-BE-004 | P1 | backend | `POST /children/{id}/sessions` with an explicit `skill_id` starts a chapter that is locked by prerequisites (only grade lock and bank size are checked in `PlayableFor`). 10 of 93 locked nodes started. The planner path never serves them. A forged client can skip the path | `node scripts/qa/extra.mjs <base>` "quest locks". Note: flows and play suites rely on this, so they need a prerequisite-satisfied fixture when fixed | extra.mjs (fails) |
| QA-BE-005 | P1 | backend/A | Passkey registration with a Chrome virtual authenticator fails: UI shows "Impossible d'ajouter la clé d'accès". Root cause not triaged (RP id/origin config for the test host, or a real bug). Login button hint passes | `node scripts/qa/extra.mjs <base>` "passkey registers" | extra.mjs (fails) |

## P2 (not blocking)
- QA-W-001 JS per route 840 KB to 1.2 MB decompressed (budget 600 KB; zod about 100 KB). `sweep.mjs` kind `js-bytes`.
- Voice-unavailable toast ("Pas de voix pour lire à voix haute") sits on the answer keypad at 360x740 until closed.
- World page hero repeats the title ("Nature / Nature"). Desktop 1280 shows a narrow phone column with large empty margins.
- axe moderate: heading-order (quest title, collection, challenges), `landmark-one-main` on 30 loads (offline, 404, parent pages), region, unique landmark on feed flag article. CLS above 0.1 on parent-subscription, parent-child, parent-settings, play-me, parent-account, parent-report.
- Feed: cycloid animation is a thin black line on white (looks like a placeholder); 29 CC BY credits are on the card only, no credits page for feed items (known). Contract lacks maxLength 128 on password and a 413 response (known).
- Content (60-question hand re-solve, seed 20261020, `node scripts/qa/sample.mjs 60`): 60 of 60 answers, distractors and explanations correct, 0 mismatches. Wording: `meteo.pluie.003` hint says "Compare les deux barres" but the question has no chart; `sport.relais.012` uses "x" not the multiplication sign; `echecs.parcours.001` cell x:1 on a 5-column grid with story "colonne 1": check the drawn grid is 1-based; 4 questions have only 2 common errors (`animaux.zoo.006`, `cuisine.tablee.001`, `cuisine.tablee.002` and one more).
- Question bank types in seed: 12 kinds (choice, numeric, truefalse, order, match, estimate, word, visual and variants); all input kinds pass `test.sh play`.

## Visual review against the owner's bar (screenshots read at 360, 768, 1280)
Sheets: `scripts/qa/out/review/sheet-{m360,t768,d1280}-{core,parent,question,feedback,feed}.png`.
- Home, world map, world pages: real photographs (forest, shuttle, bread, football, treehouse, chess), owl Numa only, no emoji, no cartoon art, no heavy borders. Pass.
- Question screens (8 worlds): a photo per question, calm cards, soft buttons. Pass, except QA-A-008 and the toast above. Some photos only loosely match the topic (clay-coloured rock under the biscuits).
- Feedback states: soft green, blue and amber cards with Numa, no red, no shake. Pass visually.
- Feed (14 cards at 360): photos, silent animations, captioned videos, credit line on every card, like and save, question reveal. Pass; the Numa mini-story card is text plus photo, labelled AI.
- Parent area: letter avatars instead of cartoon faces, soft pills, no heavy borders. Pass.
- Admin questions: no admin UI exists in the web app (API only, `docs/ADMIN_API.md`), nothing to review.
Rating: professional and photographic, playful through Numa and colour; the desktop layout is the weakest part.

## Not covered
- Admin UI (none). Real-device iOS and Android, real TTS voice, real passkey hardware.
- The first-visit tour covers the home screenshots; captured after "Passer la visite" in suites only.
