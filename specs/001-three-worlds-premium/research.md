# Research: Three Premium Worlds, Grade-True Play, Parent and Admin Fixes

**Feature**: `001-three-worlds-premium` | **Date**: 2026-11-17 | **Author**: senior expert validation (read-only study of both repos)
**Method**: spec.md owner decisions are binding and are never edited here. Every challenge is listed under "Spec amendments" with proposed wording for the owner to accept or reject. File references are real (checked in this session). "Not reproduced" means the cause was inferred from code, not observed.

Repos: web = `Services/frontend` (Next.js 16, React 19, admin in `admin/`), api = `Services/numerix-api` (Go, SQLite, seed JSON).

---

## 0. Key findings in one page

1. **Art-direction conflict (blocks FR-001/FR-002 as written).** `docs/HUMAN_VISUALS.md` and `scripts/no-cartoon-check.mjs` (run by `pnpm check`) forbid cartoon, flat vector and emoji art in the kid experience; the owner rule is "human like and photographic". Spec assumption A1 proposes "CSS 3D, SVG and canvas layers". SVG illustrations would fail the guard. The only compliant "3D" is a **photographic diorama**: real photo backdrops plus alpha cut-out photos placed on CSS 3D layers, with procedural light, shadow and particles. This needs an asset pipeline (cut-outs, licences) that is the true critical path. See SA-1.
2. **Grade-true difficulty is broken at three independent points** (not one): planner, picker and bank-only bypass. See FR-010.
3. **The content bank does not cover grades 1 to 4 for the three worlds.** Measured from `seed/questions/*.json`: echecs 71 (g1 26, g2 30, g3 15, g4 0), medecine 68 (g1 0, g2 39, g3 29, g4 0), espace 71 (g1 0, g2 34, g3 30, g4 7). Each world has only 5 skills. Grade 1 is absent in two worlds, grade 4 in two worlds. Roughly 70 percent of FR-013 is new authoring.
4. **Retry cannot be done "backward compatible" with the current answer contract**: the first answer response already carries `correct_answer`, `explain`, `method_visual` and `feedback`, so a retry would be a retry of an answer the client already holds. The server must withhold the reveal when a retry is offered. See FR-020/021.
5. **Media today is decorative and generic**: 71 questions share 6 to 8 photos per world (top asset used 27 times in echecs, 23 in medecine and espace). The espace clock question shows a space shuttle launch photo; the medecine clock question shows a stethoscope among corn. The current validator only checks that an asset exists and that criteria use known vocabulary (`internal/content/validate.go` `media()`).
6. **"Defis" is not in the nav bar** (`PlayShell.tsx` BottomNav: home, worlds, discover, cards, me), so "keep them in the nav bar" cannot be honoured for Defis or Defi du jour without a new item. See SA-8.
7. **Hyphenated world id `histoires-africaines` fails the question id regex** (`idRe` first segment `[a-z0-9]+`). See SA-7.
8. **Migration 0012 already overwrote every child's `enabled_worlds`** with the three worlds. FR-014 "existing children keep their data" must not be broken again by 0013+.

---

## 1. Per requirement

### FR-001 Per-question scene spec, objects, counts, values correct

- **Exists**: the play stage picks one of: `QuestionVisual` (bars, pictograph, clock, grid, numberline; `src/game/question-visual`), `ScenePicture` (counting grid of real object photos; `src/game/scene-picture`, layout in `layout.ts`, `MAX_GROUP = 60`), `MethodVisual` (place value blocks, after answer), `ConsequenceScene`/`OutcomeSim` (96 generic scenes = 8 topic families x 6 rigs x ok/ko; `src/game/consequence/catalog.ts`), over `IllustrationFrame` showing a per-question photo (`media[role=scene]`) or the world hero.
- **Root cause of "generic"**: scene choice is a function of `skill_id`, `visual.kind` and `scene_key` only (`familyOf`). Two questions with the same skill and visual kind get the same family. Numbers are scraped by regex from `math_text` (`StoryScreen.tsx` line ~380: `q.math_text.match(/\d+/g)`), so a decimal, a thousands separator or a number inside the prompt but not in `math_text` is read wrongly. `showCounting` requires a `sprite` media for curated questions.
- **Must change**: a new per-question `scene` object in the question JSON (data driven), resolved server side to concrete numbers, rendered by a new `scene-stage` component. Generic families remain only as a runtime fallback for non-published or generated questions.
- **Risks**: 240 or more scenes to author and review (see Content section); asset supply; a bug in one archetype affects many questions (mitigate with archetype unit tests and the per-question review hash).

### FR-002 Depth, purposeful motion, 60 fps mid phone, calm reduced motion

- **Exists**: `useParallax`/`useTilt` (`platform/motion`), `useReducedMotion` (OS setting plus `data-motion="reduced"`), CSS keyframes `nx-*` in `globals.css`, `canvas-confetti` on correct answers, `motion` 14.14 dependency. `scripts/play-perf.mjs` already throttles CPU 4x and network to 4G for LCP.
- **Gap**: no frame-time measurement, no per-scene budgets, no low-end path.
- **Decision input (WebGL vs CSS 3D)**: three.js core is about 150 KB gzip before loaders, needs a GPU context (low-end Android WebView and in-app browsers can lose it), burns battery, does not cache offline cheaply in the PWA, and makes screenshots and reduced-motion stills harder. Photographic cut-outs on CSS 3D planes already give true perspective, parallax and light at near zero JS. Recommendation: CSS 3D plus one small 2D canvas for particles and soft shadows. See plan.md section 2.
- **Risks**: Safari `preserve-3d` plus `overflow:hidden` plus `backdrop-filter` stacking bugs; many large composited layers raise GPU memory on 2 GB phones (cap layers at 8 and textures at 2.5 MP total).

### FR-003 Per-question animation review record, approved before publish

- **Exists**: nothing. Questions have `status draft|review|published`, `reviewed_by` (only enforced for AI drafts, `validate.go` `status()`).
- **Challenge**: the spec stores the record under `specs/.../review/` in the **web** repo, but the publish gate lives in the **API** seed validator and the admin publish path, which cannot read a web repo path (and CI of the API does not check out the web repo). A file-only record cannot block publish.
- **Must change**: keep the human-readable table in `specs/.../review/`, and also store a machine record on the question (`review: {status, reviewer, scene_hash, reviewed_at}`). The validator requires `approved` and a `scene_hash` equal to the hash of the current scene spec before `published`. See SA-3.
- **Risks**: reviewer is an agent; the protocol must be evidence based (frames and traces), not an opinion.

### FR-004 Numbers derived from question data

- **Exists**: client regex on `math_text` (see FR-001). Seed rule "no answer in story/prompt/math_text/hint" exists; no rule ties pictures to numbers. The "48 shown as 37.5" case was **not reproduced**: seed `medecine.json` has "48 gouttes" only in an estimate question; `37.5` appears in code only as `stopY = 37.5` (a layout coordinate in `consequence/sim.ts`), which suggests the drift came from a generic simulation that drew its own quantity. Unknown source is itself the finding: nothing guarantees equality today.
- **Must change**: the server resolves named bindings (`bind`) from the authoritative question (it has `calc`, `visual.data`, `items`) and sends resolved integers/decimals. The client never parses text. A validator proves every resolved number appears in story, prompt, `math_text`, options, items, visual data or `calc`; a frontend unit test renders every published scene and asserts counted props equal the resolved count.
- **Risks**: pre-answer scenes must not bind to the answer (leak). The answer can bind only inside the reveal block, fed by `AnswerResult.correct_answer`. Counts above the render cap (60) must be shown as labelled groups, never silently clipped (today `layoutFor` clamps to 60 and sets `capped`).

### FR-005 A clock in a space scene, or any contradicting prop, fails validation

- **Exists**: `visual.kind = clock` exists in espace (9 questions) because MES-G01 (time) is a quest of espace. The generic `time` family adds clock props to any clock question.
- **Challenge**: a literal ban breaks legitimate content (reading a station chronometer). The rule must be about **contradiction**, not the object.
- **Must change**: per world a vocabulary of allowed props and settings, plus per question `subjects`. A prop is valid when it is in `world.allowed_props` or named in the question story/prompt/visual. Photographic asset tags (`topic`, `object`, `setting` facets already exist in `seed/assets/*.json`) are the source of truth. See SA-4.

### FR-006 Story text larger, distinct; question visible while the owl speaks

- **Exists**: `StoryPanel` puts narration plus up to four bubbles (`hint`, `coach.hint`, `mascotLine` on lg, `speechWaiting` button) in one scroll region, and the question above the input. When `choicesFree` (always true in StoryScreen) the question is `shrink-0` under the scroller.
- **Root cause (inferred, to confirm by T005 repro)**: section height is `h-dvh` with stage `38dvh` (or 15/20/28/34), choices up to `58dvh`, top bar 3.5 rem. Sum can exceed 100 percent on short screens, so the `flex-1 min-h-0` narration region collapses to zero and the question or the first choices are clipped, with `overflow-hidden` hiding the loss. This is the "disappearing question".
- **Must change**: rework layout (see FR-030). Single "coach slot" showing only the newest bubble. Story text size and weight tokens (distinct block style).

### FR-010 Difficulty starts from the child's grade; never more than one grade below except review share

- **Exists and root causes** (three):
  1. `engine/planner.go` `Choose`: eligible skills are `YearIntro <= grade` with **no lower bound**; the "new skill" branch picks the **earliest school year first** (`first = min(YearIntro)`), so a grade 4 child with no history starts on grade 1 skills. `IsBankOnly(world)` removes even the upper bound: `(s.YearIntro <= grade || gr.IsBankOnly(world))`, and `PlayableFor` returns `bankAny(...)` ignoring grade for bank-only worlds.
  2. `app/content_play.go` `pickCurated`: `capGrade = 12` for bank-only worlds (echecs, medecine, espace are exactly the three worlds). `contentdb/pick.go` `Candidates` has `b.grade <= ?` (upper bound only) and `Rank` orders by `[same type, |difficulty - target|, |grade - childGrade|, hash]`: grade is the **third** key, so a grade 1 child can receive a grade 4 question whose difficulty matches the target.
  3. `gradeOf` returns 6 when the child grade is null or 0 ("everything").
  4. `TargetDifficulty(mastery)` maps mastery 0..1 to 1..5 independent of grade; an unseen skill has mastery near the prior, so a grade 4 child gets difficulty 1 or 2 of whatever grade the picker returns.
- **Must change**: strict window `[grade - 1, grade]` for candidates with the lower grade limited to a deterministic review share (proposal 15 percent); Rank key order `[sameType, gradePenalty, |difficulty - target|, hash]`; planner prefers skills whose `[annee_intro, annee_maitrise]` contains the grade, and picks the closest to the grade rather than the earliest year; bank-only worlds keep grade filtering; unseen skill prior rises with `grade - annee_intro`; null grade handled explicitly (SA-2).
- **Risks**: bank thinness: with the strict window many quests will have fewer than `MinBankQuestions = 8` candidates for a grade, so `PlayableFor` would hide chapters. This is why content (FR-013) must land before the strict window is enabled (feature flag, see plan section 4).

### FR-011 Drill-style operation skills in grades 1 and 2 only

- **Exists**: the three worlds hold `ARI-OPE-A04a, A13a, A06a` (echecs), `ARI-OPE-A05, A03b` (medecine), `ARI-OPE-A03a, A06a, A01a` (espace). `A06a` (multiplication facts) and `A03b` (product and quotient) are tagged grade 3 in the seed, `A01a` (approximation of sums) grades 3 and 4.
- **Challenge**: removing `ARI-OPE-*` from grades 3 and 4 would delete legitimate PFEQ content (multiplication facts are a cycle 2 goal; products and quotients extend to grade 4). Operations at grades 3 and 4 belong **in problem and word contexts**, not as bare "7 x 8 = ?" drills. The distinction is **presentation style**, not skill id.
- **Must change**: add `style: drill | context` on questions (derived by an authoring checklist, validated: a `drill` has no story numbers beyond the operands and a bare prompt). Picker rule: grades 3 and 4 serve `context` only, with a small `drill` review share (<= 10 percent, grade 3 only). Grades 1 and 2 may serve both. The exact skill list comes from the curriculum matrix (FR-012). See SA-5.

### FR-012 Curriculum matrix from official Quebec sources

- **Exists**: `internal/engine/data/pda-arithmetique.json` and `pda-autres-champs.json` give each skill `annee_intro`, `annee_maitrise`, `cycle`, `prerequis`, `ref_pda`. These are the engine's source and are not cited in the repo as a PFEQ extract.
- **Must do**: curriculum research with citations (Programme de formation de l'ecole quebecoise, primaire, mathematique; Progression des apprentissages, mathematique, MEQ) written in `curriculum.md`; a machine matrix `seed/curriculum/matrix.json` (grade x strand x skill x difficulty x style); a test that every engine skill used by the three worlds matches the matrix and lists diffs. Ambiguities are listed, not guessed (A3). Research is a task (T006), not part of this document; no unsourced curriculum claim is made here.
- **Risks**: PDA json may disagree with official wording; the matrix wins, the engine json is patched in the same PR with a migration note (skills are loaded from embedded json, so it is a code change, not a data migration).

### FR-013 Enough questions per grade (1 to 4) and difficulty; no repeat in a chapter; quotas of `seed/README.md`

- **Exists**: counts above. `seed/README.md` quotas are **per world file** (numeric 10, choice 10, word 8, truefalse 5, order 5, match 5, visual 5, estimate 4 = 52) plus "target - 2 per quest". They say nothing per grade or per difficulty, so a world can satisfy them with grade 2 only (which is the present state). `MinBankQuestions = 8` per quest; `reserveBank` re-serves an old question when the bank is exhausted ("even when its questions repeat"), which is the repeat the owner sees.
- **Must change**: per (world, grade) quotas (proposal: at least 20 published questions, at least 3 skills, at least 3 per difficulty 1 to 4 and at least 1 at difficulty 5, at least 2 times chapter length per quest and grade). Total at least 240 for the three worlds; existing 210 are re-graded, many rewritten so every one gets its own scene. See SA-6 for the numbers.
- **Risks**: authoring volume and the need for a PFEQ-aware reviewer; grade 1 reading limits (story 25 words, prompt 20) leave little room for story.

### FR-014 Existing children keep data; difficulty changes apply to new picks only

- **Exists**: `child_questions` (served) and `questions` (served copies keyed by `bank_id, bank_version`) mean a served beat never changes. `profile` BKT state is per skill. Changing the picker only affects `NextBeat`.
- **Risks**: BKT mastery of a skill recorded on the wrong-grade content stays; acceptable. Migration 0012 precedent (overwrite settings) must not repeat: new migrations are additive only (`answer_retries` table, no UPDATE of `child_settings`).

### FR-020 Retry once after a wrong first answer, first attempt counts, gentle hint, smaller reward

- **Exists**: `AnswerBeat` grades once, updates BKT (`prof.Observe`), stores one row in `answers` keyed `UNIQUE(beat_id, idempotency_key)` but the handler returns `409 beat_answered` when a row exists with another key. `RequestHint` returns `409 beat_answered` after an answer. The reducer has no retry state. `result.correct_answer`, `explain`, `feedback`, `method_visual` are in the first response (client then shows them in the reveal).
- **Must change**: the request carries `attempt` (1 or 2, default 1 = legacy behaviour unchanged). For `attempt: 1` the server returns, when the outcome is not correct and the question type allows retry, `retry_available: true` and a **withheld** result (no `correct_answer`, `explain`, `method_visual`; `feedback` only if it does not contain the answer). Attempt 2 is stored in a new table `answer_retries(beat_id PK, ...)`, does not call `Observe`, returns the full reveal. Retry hint = matched `common_errors[].feedback` for the first wrong value, else `hint`, else a skill-level generic nudge; never the answer (validator already forbids answer in `hint`; extend to `feedback` and new `retry_hint`).
- **Best practice and enjoyment** (to be cited in plan): immediate, non-punitive second chance, hint before the answer, reduced reward not a penalty, never say "wrong" chrome (existing rule: no red X), keep streak untouched by a retry success, show progress for effort. Exclude retry for `truefalse` (50 percent guess) and any two-option choice; for choice questions the retry removes the wrong option the child picked.
- **Risks**: reward computing (`pct` in `AnswerBeat` counts `outcome = 'correct'`) needs the half-credit rule; a child who closes the app after a first wrong answer leaves the beat answered without reveal (acceptable, mastery recorded, reveal lost; mitigate by showing the reveal on next session open only if cheap, otherwise accept).

### FR-021 Idempotency stays backward compatible: second answer accepted once, flagged `attempt: 2`, no mastery change

- **Challenge**: spec says "a second answer on the same beat is accepted once". Today a second answer with a **different** key is rejected with 409, and with the **same** key replays the first result. Both behaviours must remain for legacy clients (no `attempt` field). The new behaviour is gated on `attempt: 2` only. Replay of attempt 2 with the same key returns the stored attempt 2 result. A different key after an attempt 2 row exists is `409 beat_answered`. `attempt: 2` after a correct first answer, or before any first answer, is `409 retry_not_allowed`. Also, `beats_answered` must keep counting `answers` rows only (a retry row must never advance chapter progress); this is why a separate table is safer than a second row in `answers`.
- **Risks**: SQLite single writer makes the race safe; a Go race test is required.

### FR-022 Back to the previous question's reveal without pressing Continue again

- **Exists**: reducer drops the reveal on `BEAT_LOADED`. Continue is a deliberate step.
- **Must change**: client only: keep `lastReveal` (stage, text, explain, outcome) in state; a "Previous" control during the next question opens a read-only sheet. No API change, no mastery effect. Not available at question 1. See SA-9 (underspecified: how many steps back, and does it work after a reload).

### FR-023 Navigation world, journey, chapter, question, reveal, continue; no dead ends

- **Exists**: `WorldsScreen` -> `JourneyScreen` -> `useStartChapter` -> `StoryScreen`; `scripts/nav-audit.mjs` (every route, refresh, fr and en).
- **Gaps found**: inactive or disabled worlds can be opened in `WorldsScreen` (locked dialog, no recovery), `ListWorlds` returns every non-retired world including `draft` (`catalog.go` `Worlds`), the story error screen "Back" returns to `/play/home`. Dead ends need a Playwright walk per world and grade (T-nav).

### FR-030 Question and context always reachable; owl bubbles never push the question out

- See FR-006 root cause. Additional: `transition-[height]` on the stage (38 to 15 dvh when the sheet opens) and `transition-[max-height,opacity,padding]` on choices animate layout, which is perceived as "text jump". `NarrationText` streams text for generated scenes and grows the block. `dvh` changes while mobile browser bars hide, and while a window is resized (screen share).

### FR-031 Keypad entry never moves the viewport or hides the question

- **Exists**: `Keypad` is made of buttons (no `<input>`), plus a window `keydown` listener; `EstimateInput` uses a slider. There is no `scrollIntoView` in `src/game` or `src/features/play` (searched). So a software keyboard is not summoned by the keypad; the observed jump is probably focus moving to a pressed button inside a scroll container (`max-h-[58dvh] overflow-y-auto`) or a layout reflow when `choicesHidden` toggles. **Not reproduced**; T005 must reproduce on real emulation before the fix.
- **Must change**: `touch-action: manipulation`, `preventScroll` on programmatic focus, `overscroll-behavior: contain`, `scroll-padding`, no layout change on key press.

### FR-032 320 to 3840 px, portrait and landscape, short heights, zoom 200 percent, TV

- **Exists**: `scripts/mobile-audit.mjs` (one viewport, env-driven), `scripts/play-checks.mjs` (360x740). No shared viewport profile list exists. No short-height or screen-share profile. `StoryPanel` switches to two columns only at `lg` (1024 px width), not by height, so 1024x400 or a 600x400 shared window renders the phone layout in a tiny box.
- **Must change**: height-aware layout (container and `@media (max-height)`), see plan section 3.

### FR-033 Playwright suites for phone, tablet, desktop, TV, shared-screen; run in CI

- **Exists**: CI already runs `scripts/test.sh all` with Playwright Chromium (`.github/workflows/ci.yml`). `test.sh` has `play`, `mobile`, `nav`, `ui` modes.
- **Must change**: add a `layout` mode using a shared viewport profile list (plan section 7), a mid-question resize scenario, and wire it into `all`.

### FR-040 Trial/free-access wording never shown to parent or child; only admin grants/changes free access

- **Exists**: `subscriptions.status trial|active|unpaid|expired|canceled`; every parent registration creates a 14 day trial (`platform_auth.go` `RegisterParent`, `plLoadSub`, `Platform.TrialDays = 14`). The parent API `GET subscription` returns `status`, `trial_ends_at`, `days_left`. Web: `SubscriptionBadge` ("Essai gratuit, # jours restants"), `SubscriptionPill` (menu and settings), `ManageSubscription`, `ParentHome` card, `notify/reminders.ts` ("end of trial" reminder). Admin can already extend (`parents.go` `extend_days`, `marked_by_admin`).
- **Challenge**: the spec leaves open what happens with the automatic registration trial. If only the wording is hidden, the trial still ends silently and play stops; if the trial is removed, new parents cannot play. Also hiding the end date from parents can be a consumer-protection and Law 25 transparency risk when access later stops.
- **Must change**: server maps what parent and child tokens see (`status trial` -> a neutral `active`, no `trial_ends_at`, no `days_left`; show a neutral "Access until {date}" line if and only if the owner accepts SA-10); copy purge in web (badge, pill, manage screen, reminders, message bundles) guarded by `check-copy.mjs`; new admin-only endpoint for free access with audit. Admin UI shows true status.
- **Risks**: contract change touches `SubscriptionView` (parents and admin share the type name in web); old clients keep working because fields stay but values are neutral.

### FR-041 Profile cards redesigned, no heavy radius, obvious Delete behind typed confirmation

- **Exists**: `ParentHome` cards use `Card` (radius `--radius-lg` 20 px from `styles/tokens.css`) plus a gradient bar and chips. Delete lives only in `SettingsScreen` (typed confirmation exists: `typed.trim() !== child.display_name`) reachable through ChildOverview > Settings > scroll. `ChildOverview` header card repeats the style.
- **Must change**: card tokens (`--radius-card` 6 to 8 px), single layout for list and overview, an explicit "Delete profile" entry on the card menu leading to the existing typed-confirmation dialog (reuse, do not duplicate). Owner "dislikes the border radius added earlier": propose 6 px cards, 8 px controls, full radius only for avatars and switches; owner reviews a Storybook before/after.
- **Risks**: touching the global `--radius-*` would restyle the whole app; add card-specific tokens instead.

### FR-042 World toggles: label and switch in one tappable row

- **Exists**: `ui/switch/Switch.tsx` uses `justify-between` with `gap-4`: the label sits at the far left and the switch at the far right of a wide grid cell (`sm:grid-cols-2`). `SettingsScreen` renders `WORLD_IDS` (check which list: 20 worlds) with `Switch`.
- **Must change**: new `SwitchRow` variant: the whole row is a button/label (hit area 48 px), switch adjacent to the label (start aligned, max width 22 rem), "On"/"Off" text in addition to colour for state, `aria-checked` via Radix. Only worlds with status `published` are listed (SA-7).

### FR-043 New inactive worlds `histoires-africaines`, `english`, `francais`

- **Exists**: 20 worlds in `seed/worlds.json` (`status` column allows `draft|published|retired`), `plWorldIDs` (20), contract `WorldId` enum (20), `adminapi/children.go` `worldIDs` (**only 8**), web `WORLD_BG` and `ITEMS` are exhaustive `Record<WorldId, ...>`.
- **Challenge 1**: id with a hyphen breaks `idRe` (see SA-7). **Challenge 2**: "inactive" maps naturally to `worlds.status = 'draft'`, but `worldViews`/`ListWorlds` return every non-retired world, `worldExists` accepts `draft`, `UpdateChildSettings` validates against `plWorldIDs` (so a parent could enable an inactive world via API), `StartSession` only checks `enabledWorlds`. **Challenge 3**: `english` and `francais` as worlds overlap with the UI locales `en-CA`/`fr-CA` and with language-learning content that is out of scope; as inactive placeholders they are safe, but their ids must not collide with locale routing.
- **Must change**: single server-side world registry (published/draft) used by catalog, settings validation, session start, feed and admin; child and parent endpoints list only `published`; admin endpoint lists all and can flip status; web records get entries for the new ids (placeholder hero, name keys fr and en).

### FR-044 Home page removes Defis, Decouvrir, Defi du jour; nav keeps them; admin toggle `home_sections`; default off

- **Exists**: on `HomeFeed.tsx`: `MenuTile` "challenges" and "discover" in a six tile `nav`, `QuestCard` (Defi du jour, `/play/quest`). `BottomNav` has Discover (controlled by `feed.discover_enabled`), no Defis, no daily quest. `appconfig.Feed` has `discover_enabled`, `family_board_visible`; public config exposes `feed`. Admin app has `feed/` and `config/` pages.
- **Must change**: `Feed.home_sections {challenges, discover, daily_quest}` default false (a missing key in stored docs decodes to false, so no data migration), exposed in public config (cache 60 s) and edited in admin. Web renders each section only when on. Keep `discover_enabled` as the global switch: home discover tile = `home_sections.discover && discover_enabled`.
- **Risk**: the nav-bar clause (SA-8).

### FR-045 Default `enabled_worlds` stays three; admin can change it

- **Exists**: `plDefaultWorlds`, `plDefaultSettings`, `adminapi.defaultSettings` (three worlds), `settingRules["enabled_worlds"]` validates against the **8-world** `worldIDs` list, so the admin cannot choose among the other 12 worlds today. `main_test.go` replaces `plDefaultWorlds = plWorldIDs` in tests.
- **Must change**: admin validates against the shared registry; a platform-level default list editable in appconfig (`platform.default_worlds`, validated against published worlds) so "admin can change it" holds for **new** children without a deploy; existing children untouched.

### FR-050 Media validation rule so a question cannot publish with a media mismatch

- **Exists**: `validate.go` `media()` rules (count <= 3, role vocabulary, asset exists, criteria vocabulary). Assets carry `tags` with facets `world`, `topic`, `object`, `mood`, `setting`, `review_status`, `people_free`, `brand_free`, `alt_fr/alt_en`.
- **Challenge**: "tagged to the question's subject, numbers and setting": a photograph cannot be tagged with a number. The rule must be defined by media **role**: `scene` (decorative backdrop: world and setting must match, no contradicting object), `object` (counted item: its `object` tag must equal the counted noun resolved in `scene.counts`, and the displayed count equals the bound number), `visual` (data bound). Plus: asset `review_status = approved`, reuse cap (no asset on more than 15 percent of a world's questions; today up to 38 percent), alt text present in both languages.
- **Must change**: validator environment gets asset metadata (not just an existence callback); same function runs in `cmd/seed --validate-only`, the seedload loader, and admin publish/PUT (`adminapi/content.go`). A report mode lists every media with its decision.
- **Risks**: existing 209 questions will fail the new rule until re-tagged; roll out as warnings first (flag `media_rule=warn|error`), switch to error when T-world gates pass.

### FR-051 Independent QA agent sign-off across grades 1 to 4, locally, production-like, before any push

- **Exists**: `qa/` harness (isolated ports 18400 and 13400), `docs/QA_SIGNOFF.md`, `scripts/test.sh all`, `deploy/vps/test-gate.sh`.
- **Gap**: `qa/README.md` states `admin-propagation` is stale (expects `/admin/v1/appconfig/*` not exposed). Do not count it as a pass; repair or replace before using it to verify FR-044.
- **Challenge**: the QA agent must not be the author agent; the plan names the roles (author, animation reviewer, layout QA, security QA) and keeps evidence in the repo.

### FR-052 Security

- **Exists**: admin routes are under `/admin/v1` with audit (`parents.go` audit notes), PIN rate limit, `plCaller` role checks, govulncheck and secret scan in API CI, `pnpm audit` in web CI.
- **Risks introduced by this feature and mitigations**: (a) new admin endpoints (free access, world status, default worlds) must be role checked server side and audited; (b) retry hint must not leak the answer; (c) `scene` JSON from admin is data rendered by the client: only whitelisted archetype keys and asset ids, numeric bounds, no HTML strings; (d) parent subscription neutralisation must be enforced server side, not hidden by CSS; (e) inactive worlds must be rejected server side on `StartSession`, `GetJourney`, settings; (f) trial fields must not remain in logs/exports visible to parents (`ExportChild` includes subscription? check in T-sec).

### FR-053 Performance: no API p95 or memory regression; scene assets lazy; per-scene budget stated

- **Exists**: `cmd/loadtest`, `internal/app/perf_test.go`, web `scripts/qa/js-weight.mjs`, `JS_BUDGET_KB` in `test.sh nav`, `play-perf.mjs`.
- **Risks**: `Candidates` already scans a quest with a `NOT EXISTS` join per request; adding grade windows and a review share must keep it one indexed query (add index `bank_questions(world_id, skill_id, status, grade)` if EXPLAIN shows a scan; the bank is small, ~2k rows, so risk is low). The resolved scene JSON adds bytes to the beat payload (cap 4 KB).

### SC-001 to SC-005

- SC-001 needs the machine review record (FR-003) to be countable by CI. SC-002 needs the media report with zero mismatches. SC-003 needs a deterministic distribution test (seeded children, fixed RNG; `Rank` is already deterministic through `tieBreak`). SC-004 needs the viewport matrix. SC-005 needs sign-off documents in both repos (`docs/QA_SIGNOFF.md` exists).

---

## 2. Scene system research

### 2.1 Why not WebGL/three.js for this product

| Criterion | WebGL / three.js | CSS 3D + photographic layers + 2D canvas |
|---|---|---|
| Bundle | about 150 KB gzip core, plus loaders and a render loop | under 25 KB gzip shared engine, archetypes 4 to 12 KB each, lazy |
| Low-end phones, in-app browsers | context loss, black canvas, thermal throttling | composited layers degrade gracefully; fallback is flat photo |
| Photographic rule (HUMAN_VISUALS) | needs 3D models (not photographs) or planes (same as CSS) | native fit: photo cut-outs on planes |
| Reduced motion and stills | needs a render pass to produce a still | the still is the CSS at rest; same DOM |
| PWA offline | shaders, models, textures all to cache | images only, already cached by the service worker |
| Accessibility | canvas is opaque to assistive tech | DOM with `role=img` description; props `aria-hidden` |
| Testing | pixel diffs flaky across GPUs | DOM assertions (counts, positions) plus frame sampling |
| Wow factor | highest ceiling | enough with real depth: perspective, parallax, shadows, light sweeps, particles |

Decision: CSS 3D plus canvas particles. A WebGL path is explicitly deferred (re-open only if the animation reviewer shows a concrete scene that CSS cannot deliver and the budget allows).

### 2.2 Uniqueness is defined, not hoped for

A scene **signature** = (archetype, subject set, layout, camera preset, light preset, hook, reveal choreography ids). Machine rules: no two questions of the same quest share a signature; within a world and grade no archetype is used by more than 3 questions; consecutive beats in a chapter never share archetype (picker already avoids same `shape`; extend to archetype). The animation reviewer adds a human judgement of "uniquely captivating".

### 2.3 Asset reality (critical path)

Photographic cut-outs of world-relevant objects are needed: chess pieces and boards, medical tools, bandages, animals at a vet, drops and vials, space capsule, station, moon, planets, instruments. Existing stock: 50 object photos in `public/objects`, 6 backdrop photos per world in `seed/assets`, an alpha cut-out routine in `tools/assets/objects.mjs` (flood fill from the border). Needed per world: about 12 backdrops and about 40 cut-outs, all licensed (`people_free`, `brand_free`, creator, licence text; Credits page already renders `seed/assets/credits.json`). Estimated 36 backdrops + 120 cut-outs in total. This sourcing is a separate task stream (T008, T076 to T078) and must start first because content scene tasks depend on it.

---

## 3. Content research (three worlds, measured)

| World | Total | g1 | g2 | g3 | g4 | Skills | Difficulty spread | Notes |
|---|---|---|---|---|---|---|---|---|
| echecs | 71 | 26 | 30 | 15 | 0 | GEO-A01, GEO-A02, ARI-OPE-A04a, A13a, A06a | d1 17, d2 23, d3 26, d4 5 (d5 0) | A06a only at grade 3; 52 grid visuals; top asset used 27 times |
| medecine | 68 | 0 | 39 | 29 | 0 | ARI-OPE-A05, MES-F03, MES-G01, STA-03a, ARI-OPE-A03b | d1 9, d2 23, d3 30, d4 6 | 11 clock visuals; clock question shows a stethoscope photo |
| espace | 71 | 0 | 34 | 30 | 7 | ARI-SEN-A08, ARI-OPE-A03a, A06a, MES-G01, ARI-OPE-A01a | d1 7, d2 32, d3 30, d4 2 (d5 0) | 9 clock visuals in space; shuttle photo |

All 210 are `published`; zero at difficulty 5 in all three worlds; no grade 1 in medecine and espace, no grade 4 in echecs and medecine.

Proposed target (SA-6): at least 20 per world per grade = at least 240 total, so **at least 190 questions to author or rewrite** (existing grade-fit questions are kept only if they pass the new scene and media rules).

---

## 4. Spec amendments (for owner decision; owner decisions above are not altered)

**SA-1 (A1, FR-001, FR-002) Art direction.** Current: "3D is delivered with CSS 3D transforms, SVG and canvas layers". Conflict: `HUMAN_VISUALS.md` and `no-cartoon-check.mjs` forbid flat vector art. Proposed wording: "3D is delivered as a photographic diorama: real photo backdrops and alpha cut-out photos placed on CSS 3D layers (perspective, parallax, shadow, light), with procedural light, dust and particles on a 2D canvas. SVG is allowed only for non-figurative primitives (masks, gradients, measurement overlays, shadows). No drawn or cartoon figures. The no-cartoon guard gets a documented allowlist for `game/scene-stage`." Needs owner confirmation (decision D3).

**SA-2 (FR-010) Grade window and unknown grade.** Current: "never more than one grade below, except a small review share". Add: "never above the child's grade" (root cause: bank-only worlds serve any year) and define the review share as a deterministic 15 percent of picks, only from grade - 1, and only when that quest has such candidates. For a child with no grade, the API treats the grade as 1 and the parent app asks for the grade at the next login (today `gradeOf` returns 6 = everything).

**SA-3 (FR-003) Review record location.** Current: record in `specs/.../review/`. Proposed: "Human-readable review tables live in `specs/001-three-worlds-premium/review/<world>-g<grade>.md` (one row per question). The machine record `review {status, reviewer, scene_hash, reviewed_at}` is stored on the question and blocks publish when missing, not `approved`, or when `scene_hash` differs from the current scene."

**SA-4 (FR-005) Contradicting props.** Current: "a clock in a space scene ... fails validation". Proposed: "A scene prop fails validation when it is neither in the world's allowed-prop vocabulary nor named in the question (story, prompt, visual). A clock is valid in espace when the question is about time and the prop is set as a station chronometer."

**SA-5 (FR-011) Drill by style, not by skill id.** Current: "`ARI-OPE-*` drills are served in grades 1 and 2 only". Proposed: "Questions have `style: drill | context`. Grades 3 and 4 are served `context` questions only (plus at most 10 percent `drill` review at grade 3). Skills such as multiplication facts remain in grade 3 because the curriculum introduces them there, delivered as problems. The exact skill and style table is the curriculum matrix."

**SA-6 (FR-013) Quotas per grade.** Current: "every grade has at least the quotas in `seed/README.md`" (those are per world). Proposed: "Per world and per grade 1 to 4: at least 20 published questions, at least 3 skills, at least 3 questions at each difficulty 1 to 4 and at least 1 at difficulty 5 (grade 1: difficulties 1 to 4 only, owner to confirm), and at least twice the chapter length per quest and grade. The world-file quotas stay."

**SA-7 (FR-043) World ids.** Current: three ids including `histoires-africaines`. Proposed: keep the owner's id and relax `idRe` first segment to `[a-z0-9-]+` with a test (question id `histoires-africaines.<quest>.001`, world is the text before the first dot). Fallback if the owner prefers no code change: id `histoires` (display name stays "Histoires africaines"). Also state: "inactive" means `worlds.status = draft`: hidden from child and parent endpoints, rejected by session start and settings, visible and editable in admin.

**SA-8 (FR-044) Defis in the nav bar.** Current: "keep them in the nav bar". Fact: the child BottomNav has Home, Worlds, Discover, Cards, Me; Defis and Defi du jour are not there. Options: (a) add Defis as a 6th item (crowded at 320 px), (b) replace Cards by Defis and move Cards under Me, (c) keep nav as is and reach Defis from Me. Needs owner choice (decision D2). Recommendation: (c) for Defi du jour and a 5-item nav with Defis replacing nothing: not possible, so (b) is the cleanest.

**SA-9 (FR-022) Previous reveal scope.** Current: "go back to the previous question's reveal". Proposed: "One step back only, read only, available while the next question is shown, lost on reload, no effect on mastery or retry".

**SA-10 (FR-040) What a parent may see.** Current: "Parents see neutral plan information only". Proposed: "Parent screens show 'Access active until {date}' (no words trial, free, essai, gratuit, days left) and a renew prompt only after access has ended. Admin screens show the real status. The registration trial stays technically (owner decision D1: keep silently or replace by an admin grant at sign-up)."

**SA-11 (FR-020) Retry scope.** Current: "the child may try once more". Proposed: "Retry is offered for numeric, word, order, match, estimate and choice questions with 3 or more options (the wrong option chosen is removed); not for true/false. The retry hint never contains the answer (validator enforced). A correct retry gives half reward and does not extend the streak or change mastery."

**SA-12 (FR-051/SC-005) Review roles.** Add: "The author of a question or scene never approves it. Roles: author agent, animation expert reviewer, layout QA, security QA, independent QA sign-off."

**SA-13 (Scope) Grade 1 content volume.** Grade 1 reading limits (story 25 words, prompt 20, sentence 14) and pre-readers: the voice read-aloud (`read_aloud` setting, human voice clips) becomes a requirement for grade 1 questions. Proposed: add to FR-013 "every grade 1 question has read-aloud text".

---

## 5. Open owner decisions

| Id | Decision | Recommended default | Blocks |
|---|---|---|---|
| D1 | Registration trial: keep silently, or replace by admin-only grant | keep silently, neutral wording (SA-10) | T021, T058 |
| D2 | Defis in nav bar (SA-8) | replace Cards by Defis in the nav, Cards under Me | T059 |
| D3 | Photographic diorama and SVG allowlist (SA-1) | accept | T009, T049 |
| D4 | World id `histoires-africaines` vs `histoires` (SA-7) | keep hyphen, relax regex | T018 |
| D5 | Quotas per grade, grade 1 difficulty range (SA-6) | accept | T029, content |
| D6 | Unknown child grade treated as 1 (SA-2) | accept | T012 |
| D7 | Asset budget and spend for licensed photography (about 36 backdrops, 120 cut-outs) | approve | T008, T076 to T078 |

---

## 6. Risks (ranked)

1. Photographic asset supply and licensing (critical path, may delay every scene task).
2. Content volume (about 190 new or rewritten questions, each with a scene and a review).
3. Strict grade window hiding chapters until content lands (feature flag and ordering mitigate).
4. Retry flow touching the answer contract (security of the reveal, reward maths).
5. Scene performance on mid phones (budgets, caps, frame sampling at 4x CPU).
6. Layout rewrite regressions on non-play screens that reuse `StoryPanel`? (only StoryScreen and stories use it; confirmed by search).
7. Trial wording removal leaving parents unaware of the end of access (SA-10).
8. Contract drift: two copies of OpenAPI (`numerix-api/api/openapi30.yaml`, `frontend/contracts/openapi.yaml`) plus generated Go and TS must change in one pair of PRs (CLAUDE.md rule 6).
