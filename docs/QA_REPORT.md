# QA report (living)

Round 2, 2026-10-20. NOT SIGNED OFF (see Open; QA-A-008 and the front-end P2 items are fixed on `fix/qa-round2`, the backend items QA-BE-004 and QA-BE-005 are still open). Target: clean checkout of `release/candidate` (01aaff8) + numerix-api main (0e2bd4c), built and seeded fresh (1229 questions, 202 assets, 200 feed items), own ports 18140 (API) and 13140 (web), `QA_FRESH=1` refuses a busy port. Branch with the round-2 harness changes: `qa/round2` (bdd121e and later) in the QA worktree.
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
| regress-strict QA-A-008 (5 viewports x 20 worlds), after the fix | 100/100 pass |
| After the fix (`fix/qa-round2`): `pnpm check`, `pnpm build`, `test.sh all` (all but the two known backend `extra` items), `test.sh play`, `test.sh images` | pass |
| load 50 rps x 30 s, twice, fresh seeded DB | answer p95 1.7 / 1.7 ms, beats 3.7 / 3.7 ms, start 1.7 / 1.7 ms, health 0 ms; 0 x 5xx, 0 x 429 |
| extra: fr/en on every route, logout, credits links, panel | pass except the two items below |

## Open
| Id | Sev | Owner | Title | Repro | Test |
|---|---|---|---|---|---|
| QA-A-008 | P1 | A | FIXED on `fix/qa-round2`. The feedback sheet hid the tail of the question on a 360x740 phone. Cause: the page scrolled under a fixed sheet. Fix: on a phone at least 600 px tall the panel now ends where the sheet starts (height 100dvh minus the measured sheet), the stage shrinks to 15dvh, and the question and caption sit above the sheet with no scrolling. Landscape phones (under 600 px tall) still scroll. `regress-strict.mjs` now covers 20 worlds x 5 viewports (360x740, 390x844, 768x1024, 1280x720, 1366x768): question, caption and answers fully visible and not covered, `Continuer` on screen, no toast over the answers. 100/100 pass; before the fix 12 failed with the stricter check | `node scripts/qa/regress-strict.mjs <base>` | regress-strict.mjs (passes) |
| QA-BE-004 | P1 | backend | `POST /children/{id}/sessions` with an explicit `skill_id` starts a chapter that is locked by prerequisites (only grade lock and bank size are checked in `PlayableFor`). 10 of 93 locked nodes started. The planner path never serves them. A forged client can skip the path | `node scripts/qa/extra.mjs <base>` "quest locks". Note: flows and play suites rely on this, so they need a prerequisite-satisfied fixture when fixed | extra.mjs (fails) |
| QA-BE-005 | P1 | backend/A | Passkey registration with a Chrome virtual authenticator fails: UI shows "Impossible d'ajouter la clé d'accès". Root cause not triaged (RP id/origin config for the test host, or a real bug). Login button hint passes | `node scripts/qa/extra.mjs <base>` "passkey registers" | extra.mjs (fails) |

## P2 (not blocking)
- QA-W-001 JS per route: was 840 KB to 1.2 MB, now 692 KB to 842 KB on every route except the welcome page `/` (1.4 MB, to be checked). Done: zod removed from every client path (public env is parsed by hand in `src/config/env.ts`, server env stays on zod in `server-env.ts`, the two forms use `src/shared/form-resolver.ts`). Still above the 600 KB budget: react-dom 235 KB and the Next client 158 KB are the floor, then next-intl 88 KB, Radix 53 KB, motion. Lazy-loading motion or trimming next-intl was judged too risky for this round.
- Voice-unavailable toast on the answer keypad at 360x740: fixed, toasts now sit at the top under the app bar. Guarded by the toast check in `regress-strict.mjs`.
- World page hero "Nature / Nature": fixed, the tagline is hidden when it repeats the name. Wide screens: home, world page and Me use up to 56 rem from 1024 px (two columns for the world list, four for recent cards) instead of 42 rem.
- axe moderate: heading-order (quest card, challenge card and empty state are now h2), `landmark-one-main` (parent pages and the error, 404 and offline pages now have a main) and region: closed, 0 hits in the sweep. Still open: `landmark-unique` on the feed article (two cards share the title "Des quilles de bowling", the aria-label is the title and `scripts/feed-suite.mjs` selects on it).
- CLS: parent-subscription, parent-account (360), parent-settings, play-me and parent-child at 360 are now under 0.1 (footer kept below the fold while content loads, skeletons sized like the content, Me settings panels wait for the stats). Still above 0.1: parent-child at 768 (0.35) and 1280 (0.19) and parent-account at 768 (0.12); the child page loads its panels one by one and the skeleton heights are only tuned for 360.
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
