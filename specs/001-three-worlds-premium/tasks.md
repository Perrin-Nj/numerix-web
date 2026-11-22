---
description: "Task list for 001-three-worlds-premium"
---

# Tasks: Three Premium Worlds, Grade-True Play, Parent and Admin Fixes

**Input**: `specs/001-three-worlds-premium/` spec.md, plan.md, research.md
**Prerequisites**: spec.md (owner decisions), plan.md, research.md (amendments SA-1 to SA-13, decisions D1 to D7)
**Tests**: required by spec (FR-033, FR-051, constitution VI). Tests are written first and must fail for the documented reason before the fix.
**Rule**: no task commits, pushes or opens a PR. Branch work only, owner approves PRs (constitution II). No AI attribution lines.

## Format: `[ID] [P?] [Story] [Repo] [FR ids] Description (needs: ids)`

- **[P]** can run in parallel with other [P] tasks of the same phase when their "needs" are met (different files, no shared state)
- **Story**: US1 scenes, US2 difficulty and content, US3 retry and flow, US4 layout, US5 parent and admin, US6 quality gates
- **Repo**: WEB = `Services/frontend` (admin in `admin/`), API = `Services/numerix-api`, BOTH = same task edits both
- Roles: AUTH = author agent, ANIM = animation expert reviewer (never the author), QA = independent QA agent, OWNER = decision by the owner

---

## Phase 0: Decisions, baselines, repro tests, research (nothing ships)

- [ ] T001 [OWNER] [US6] [all] Record answers to decisions D1 to D7 and accept or reject SA-1 to SA-13 in spec.md "Clarifications" (new section; owner decisions above stay verbatim). Blocks the tasks named in research.md section 5.
- [ ] T002 [P] [US6] [BOTH] [FR-053, SC-005] Baseline: run `go test ./... -race`, `cmd/loadtest` (p95, memory), `scripts/test.sh all`, `scripts/qa/js-weight.mjs`, `play-perf.mjs`; write `specs/001-three-worlds-premium/baseline.md` (numbers, commit ids, date).
- [ ] T003 [P] [US2] [API] [FR-010, FR-014, SC-003] Failing Go tests in `internal/contentdb/pick_test.go` and `internal/engine/planner_test.go`: grade 1 child in a bank-only world is served a grade 4 question; grade 4 child with no history gets the earliest-year skill; null grade becomes 6; Rank orders grade third.
- [ ] T004 [P] [US3] [API] [FR-020, FR-021, FR-043, FR-045] Characterization Go tests documenting today: second answer with another key is `409 beat_answered`; same key replays; hint after answer is 409; `ListWorlds` returns `draft` worlds; parent `UpdateChildSettings` accepts any `plWorldIDs`; admin `settingRules` only knows 8 worlds.
- [ ] T005 [P] [US4] [WEB] [FR-006, FR-030, FR-031, FR-032, FR-033] Create `scripts/lib/viewports.mjs` (profile list from plan section 7) and failing `scripts/play-layout.mjs` (question visible, no horizontal scroll, text stability, layout shift, bubble count, resize mid-question, keypad no jump). Must fail on current code at 600x400, 1024x400, 320x568 for the documented causes. Add `layout` mode to `scripts/test.sh` (not yet in `all`).
- [ ] T006 [P] [US2] [WEB] [FR-012] Curriculum research: write `specs/001-three-worlds-premium/curriculum.md` from official Quebec sources (PFEQ primary mathematics, Progression des apprentissages mathematique): per grade 1 to 4 strands, skills, difficulty expectations, drill vs problem contexts; cite URL and edition for every claim; list ambiguities, do not guess.
- [ ] T007 [US2] [API] [FR-011, FR-012, FR-013] Create `seed/curriculum/matrix.json` (grade x strand x skill x difficulty range x style x source ref) from T006, plus `internal/content/matrix_test.go` that every engine skill used by the three worlds is in the matrix and lists diffs against `internal/engine/data/pda-*.json` (needs: T006).
- [ ] T008 [P] [US1] [BOTH] [FR-001, FR-002, FR-053] Asset sourcing plan and pipeline: licensed photo backdrops (about 12 per world) and alpha cut-outs (about 40 per world), licence and attribution fields, `people_free`/`brand_free`, extend `tools/assets/objects.mjs` for alpha cut-outs with max weights (backdrop 45 KB at 960 px, cut-out 12 KB), update `seed/assets` schema (`kind: cutout`, `has_alpha`, `object` tag) and credits generation. Output: `assets-plan.md` with the exact shot list per world and grade (needs: T001 for D7).
- [ ] T009 [US1] [WEB] [FR-001] Update `scripts/no-cartoon-check.mjs` with a documented allowlist for non-figurative SVG and canvas inside `src/game/scene-stage` (masks, gradients, overlays); keep every other ban; add a unit case (needs: T001 for D3).
- [ ] T010 [US6] [WEB] [all] Spec Kit housekeeping: after T001, apply accepted amendments to spec.md without altering owner decisions; re-run this analysis (tasks.md and analysis.md) for drift.

**Checkpoint QA-0**: T003, T004, T005 red for the documented reasons; baseline recorded; decisions answered. Do not start Phase 1 code before this.

---

## Phase 1: API foundation (Go)

**Contract first.** Phase 2 WEB tasks marked "needs T011" start after the contract task lands.

- [ ] T011 [US3] [BOTH] [FR-010, FR-020, FR-021, FR-040, FR-043, FR-044, FR-050] Contract: edit `numerix-api/api/openapi30.yaml` and `frontend/contracts/openapi.yaml` (and `openapi.admin.yaml`) for C1 to C12 of plan section 4; regenerate `api/api.gen.go` (oapi-codegen) and update `contracts/BACKEND_REQUIREMENTS.md`; add `scripts/test.sh contract` expectations (needs: T001, T004).
- [ ] T012 [US2] [API] [FR-010, FR-014] Grade-true engine behind `platform.grade_window` (default off): `gradeOf` null -> 1; planner closest-year and window rule; `IsBankOnly` stops bypassing year in `Choose` and `PlayableFor`; `Candidates` window `[grade-1, grade]`; `Rank` key order `[sameType, gradePenalty, |difficulty-target|, hash]`; deterministic 15 percent review share by `hash(childID, beatIdx)`; make T003 green with flag on and prove flag off equals baseline (golden test) (needs: T003, T011, T001/D6).
- [ ] T013 [US2] [API] [FR-010] Unseen-skill prior `clamp(0.25 + step*(grade - annee_intro), 0.25, 0.6)` in `engine/bkt.go` with `grade_prior_base`/`grade_prior_step` in appconfig; table tests (needs: T012).
- [ ] T014 [US2] [API] [FR-011] `style: drill|context` on `content.Question`, validator rule T1, picker excludes `drill` for grade >= 3 except a 10 percent review at grade 3, documented in `seed/README.md` (needs: T007, T012).
- [ ] T015 [US3] [API] [FR-020, FR-021] Migration `0013_answer_retries.sql` plus retry handling in `internal/app/game_answer.go`: `attempt` flag, withheld first result when retry is available and `platform.retry_enabled`, attempt 2 stored in `answer_retries` with no `Observe`, half credit in the card threshold, new error codes `retry_not_allowed` (needs: T011, T004).
- [ ] T016 [US3] [API] [FR-020] Hint in the retry window in `internal/app/content_play.go` `RequestHint`: matched `common_errors[].feedback` then `hint` then canned skill nudge; validator extension: `hint`, `retry_hint`, `feedback` never contain the answer (digits and number words) (needs: T015).
- [ ] T017 [US3] [API] [FR-021, FR-052] Retry tests (`internal/app/retry_test.go`): replay with same key, other key 409, attempt 2 after correct or before first 409, mastery unchanged by attempt 2, chapter counts unchanged, half credit, concurrent race under `-race`, legacy client payload byte-identical, answer-leak scan over all seed questions (needs: T015, T016).
- [ ] T018 [US5] [API] [FR-043, FR-045, FR-052] World registry from `worlds.status`: replace `plWorldIDs`, `adminapi.worldIDs` and `worldExists` with one registry; child and parent endpoints list `published` only; `StartSession`, `GetJourney`, parent `UpdateChildSettings` reject `draft` with `world_inactive`; relax `idRe` first segment to allow hyphen (per D4) with tests; seed 3 `draft` worlds in `seed/worlds.json` (ids per D4, ord 21 to 23, fr and en names, accents, placeholder hero) (needs: T004, T011, T001/D4).
- [ ] T019 [P] [US5] [API] [FR-043, FR-052] Admin `PUT /admin/v1/worlds/{id}/status` (published or draft) with audit entry, role check, cache invalidation (`content.AfterCommit`), tests (needs: T018).
- [ ] T020 [P] [US5] [API] [FR-044, FR-045] Appconfig: `Feed.home_sections {challenges, discover, daily_quest}` default false, `Platform.default_worlds` (validated against published worlds), `retry_enabled`, `grade_window`, constants; public config exposure; `config_public_test.go` key check; defaults used by `plDefaultSettings`, `enabledWorlds` fallback, `adminapi.defaultSettings` (needs: T011, T018).
- [ ] T021 [US5] [API] [FR-040, FR-052] Neutral subscription for parent and child tokens (status never `trial`, no `trial_ends_at`/`days_left`, `access_until`) and admin `PUT /admin/v1/parents/{id}/free-access` with audit; tests per role; scan all parent-visible responses (incl. export) for trial fields (needs: T011, T001/D1).
- [ ] T022 [US1] [API] [FR-001, FR-004] `internal/content/scene.go`: `SceneSpec` types, canonical JSON, `scene_hash`, `seed/scene/archetypes.json` registry, bind resolution (`calc`, `math_text`, `visual`, `items`, `choices`, `answer`) (needs: T011).
- [ ] T023 [US1] [API] [FR-001, FR-004, FR-005] Scene validator rules S1 to S7 (archetype, provenance, counts cap and grouping, vocab and allowed props per world in `worlds` data, budgets, uniqueness, alt numbers) with table tests of good and bad scenes, including the 48 vs 37.5 case and the clock-in-space case (needs: T022).
- [ ] T024 [US6] [API] [FR-050, SC-002] Media rule M1 to M6 in `internal/content/media_rule.go`; `Env.AssetMeta` and `Env.World` callbacks wired in `seedload` and `adminapi`; asset reuse cap warning; tests (needs: T022, T008).
- [ ] T025 [US1] [API] [FR-003, SC-001] Review gate R1: `review {status, reviewer, scene_hash, reviewed_at}` on the question, publish requires `approved` with matching hash for scene worlds; AI-draft rule kept; tests (needs: T022).
- [ ] T026 [US1] [API] [FR-004] `curatedBeatView` emits resolved `scene` (numbers, media refs, alt, camera, light, hook, reveal) and `style`; never bind sources or answer-derived values before the answer; reveal-only values only via `AnswerResult`; payload size cap 4 KB test (needs: T022).
- [ ] T027 [US6] [API] [FR-050, FR-052] Admin question create, update and publish call the same `content.Validate` with full env; extend `adminapi/content_test.go`; admin cannot publish scene worlds without review (needs: T023, T024, T025).
- [ ] T028 [P] [US6] [API] [FR-050, SC-002] `cmd/seed --report-media` and `--export-resolved-scenes <file>`; add both to API CI after `--validate-only`; document in `seed/README.md` (needs: T024, T026).
- [ ] T029 [US2] [API] [FR-013] Per (world, grade) quota validator Q1 per SA-6 with level flag (warning now, error at gate), plus admin coverage endpoint extended by grade (needs: T007, T001/D5).
- [ ] T030 [P] [US6] [API] [FR-052] Security tests: role matrix for every new admin route (parent and child tokens get 403), child cannot answer or hint another child's beat, scene JSON abuse (unknown archetype, count 10000, negative, script strings), inactive world bypass, `govulncheck`, `secret-scan.sh` (needs: T015 to T021).
- [ ] T031 [P] [US6] [API] [FR-053] Performance: `EXPLAIN QUERY PLAN` of `Candidates` with the window, add `idx_bank_pick` to 0013 only if a scan appears, `cmd/loadtest` vs baseline (p95 within 5 percent, memory flat), beat payload bytes (needs: T012, T026).

**Checkpoint QA-1** [QA]: `go test ./... -race -count=1`, `cmd/seed --validate-only` (warn level), authz matrix, loadtest delta, flags off produce the baseline golden beat and answer payloads. Gate before any content is published.

---

## Phase 2: Web foundation (layout, retry UI, scene-stage core, parent and admin UI)

### Layout and flow (US4, US3)

- [ ] T040 [US6] [WEB] [all] Sync generated types: `src/data/api/schema.d.ts`, `types.ts`, `platform-types.ts`, hooks (`sendAnswer` with `attempt`, `getHint` kind, `usePublicConfig().feed.home_sections`), `KNOWN` error codes in `StoryScreen` (needs: T011).
- [ ] T041 [US4] [WEB] [FR-030, FR-031, FR-032] Rewrite `src/game/story-panel/StoryPanel.tsx`: grid rows, `svh` base, no height transitions, sticky question, height-aware two-column mode (`max-height: 520px`), minimum stage, scroll hint; update `StoryPanel.stories.tsx` (needs: T005).
- [ ] T042 [US4] [WEB] [FR-030, FR-006] Single coach slot in `StoryScreen` (latest of hint, coach hint, mascot line), fixed min-height, no stacking (needs: T041).
- [ ] T043 [P] [US4] [WEB] [FR-006] Story text style tokens (larger, distinct block) in `NarrationText` and `StoryPanel`; question stays visible while the owl speaks; fr and en text-length stories (needs: T041).
- [ ] T044 [P] [US4] [WEB] [FR-031] Keypad and inputs: `touch-action`, `preventDefault` on pointer down focus scroll, `overscroll-behavior: contain`, fixed-width digits, no layout change on press, `EstimateInput` visual viewport test (needs: T041).
- [ ] T045 [US4] [WEB] [FR-033, SC-004] Turn `play-layout.mjs` green on all profiles and the resize-mid-question scenario; add `layout` to `scripts/test.sh all` and CI; fix findings (needs: T041, T042, T043, T044).
- [ ] T046 [US3] [WEB] [FR-020] Retry UX: `story-machine` state `attempt`, phase `retrying`, `ANSWER_RETRY_AVAILABLE`, `RETRY_SENT`; hint in coach slot; wrong option disabled or entry cleared; smaller reward burst; streak unchanged; fr and en copy through `copy` bundles; Vitest for the reducer; Storybook states (needs: T040, T042, T015).
- [ ] T047 [US3] [WEB] [FR-022] Previous reveal: `lastReveal` in state, "Revoir la reponse precedente" button from question 2, read-only dialog, Escape, no persistence; Playwright case (needs: T040, T041).
- [ ] T048 [US3] [WEB] [FR-023] Navigation audit and fixes: extend `scripts/nav-audit.mjs` and `play-checks.mjs` for world, journey, chapter, question, reveal, continue per world and grade; error screens always have a working way back; inactive worlds never reachable (needs: T018, T041).

### Scene stage (US1)

- [ ] T049 [US1] [WEB] [FR-002, FR-004, FR-006] `src/game/scene-stage` core: `spec.ts`, `bind.ts` (counts, grouping above cap), `clock.ts`, `describe.ts`, `rig.css`, `fx/Particles.ts`, `SceneStage.tsx` with lite tier, reduced-motion still, replay button; Storybook with fr, en, dark, high contrast, TV (needs: T040, T009).
- [ ] T050 [US1] [WEB] [FR-001, FR-053] Archetype registry with dynamic imports, error boundary, fallback to `QuestionVisual` or `ScenePicture`, `reportError`; preload next scene during the reveal (extend `preloadMedia`); service worker precache list per world pack (needs: T049).
- [ ] T051 [US1] [WEB] [FR-001, FR-002] Choreography idle, entrance, reveal ok and ko (using `correct_answer` for reveal-only values); compose in `StoryScreen`: scene as the stage, embedded `visual` plane, then `MethodVisual`; questions without `scene` unchanged (needs: T049, T050).
- [ ] T052 [P] [US1] [WEB] [FR-004, FR-005] `scripts/check-scene-spec.mjs` (node, no browser): bind, counts equal bound numbers (48 renders 48), grouping, forbidden props, signature uniqueness over the API export, registry drift test vs `seed/scene/archetypes.json`; add to `pnpm check` (needs: T049, T028).
- [ ] T053 [P] [US1] [WEB] [FR-002, FR-053] `scripts/check-scene-budget.mjs` (gzip per chunk, DOM nodes, layers) and `scripts/play-scenes.mjs` frame sampling at 4x CPU, heap leak over 30 scenes, evidence generator for the review protocol (frames, contact sheet, JSON) (needs: T051).
- [ ] T054 [US1] [WEB] [FR-002, SC-004] Accessibility: `role=img` label with quantities, reduced-motion e2e, axe, keyboard replay, contrast, no flash above 3 Hz check (needs: T051).
- [ ] T055 [US1] [BOTH] [FR-001, FR-003, FR-050, SC-001] **Pilot**: author 3 scenes (one per world, existing questions `espace.horloge.001`, one echecs grid question, one medecine dosage question), validate, render, measure, expert review, publish end to end; fix pipeline findings (needs: T023 to T027, T051, T053, T054, T076 to T078 pilot assets).

### Parent and admin (US5)

- [ ] T056 [P] [US5] [WEB] [FR-042] `src/game/switch-row` (whole row tappable, switch beside label, On/Off text, 48 px) and use it for world toggles in `SettingsScreen` and then other switches; stories; Playwright at 320 and 1280 (needs: T040).
- [ ] T057 [P] [US5] [WEB] [FR-041] `child-card` widget and tokens `--radius-card`, `--radius-control`; shared `DeleteChildDialog` extracted from `SettingsScreen`; visible "Delete profile" on the card; use in `ParentHome` and `ChildOverview`; before and after stories for owner review (needs: T040).
- [ ] T058 [P] [US5] [WEB] [FR-040] Remove trial and free wording for parent and child: `SubscriptionBadge`, `SubscriptionPill`, `ManageSubscription`, `ParentHome` card, `notify/reminders.ts`, message bundles fr and en; add banned words to `scripts/check-copy.mjs` for non-admin bundles; neutral "Access until" line per SA-10 (needs: T021, T040, T001/D1).
- [ ] T059 [P] [US5] [WEB] [FR-044] `HomeFeed.tsx`: Defis tile, Discover tile and Defi du jour card render only when `home_sections` on (and `discover_enabled` for discover); `PlayShell` BottomNav per D2 (add Defis, move Cards under Me or as decided); Playwright for default off and each toggle on (needs: T020, T040, T001/D2).
- [ ] T060 [P] [US5] [WEB] [FR-043, FR-045] Inactive worlds: `WorldsScreen` shows only published and enabled worlds (remove the "disabled worlds" reveal for inactive ones), `WORLD_BG`, `ITEMS`, i18n `worlds.*`, hero placeholder for the 3 new ids; Parent toggles list published worlds only (needs: T018, T040).
- [ ] T061 [US5] [WEB] [FR-040, FR-043, FR-044, FR-045] Admin app (`admin/`): parent page "Free access" panel with real status, worlds page with status switch, default worlds and `grade_window`/`retry_enabled` in the platform editor, feed page `home_sections` switches, question editor fields `style`, `scene` (JSON with preview via the same `SceneStage` through a shared package or iframe), `review`, `retry_hint` (needs: T019, T020, T021, T027).
- [ ] T062 [US6] [WEB] [constitution I, IV] Storybook completeness (`check:stories`), `check-architecture`, `check-copy`, `no-cartoon-check`, `pnpm typecheck`, `pnpm lint`, `pnpm build` green; docs `docs/ARCHITECTURE.md` and `src/game/scene-stage/README.md` (public API and rules) (needs: T049 to T061).

**Checkpoint QA-2** [ANIM, QA]: pilot evidence reviewed and `approved`; frame sampling within budget; leak test flat; axe clean; `test.sh layout` green; flags still off in all non-test configs. Content volume work starts only after this checkpoint.

---

## Phase 3: Archetypes, assets and content by world x grade x batch

Asset and archetype tasks run in parallel with each other; each content batch needs the archetype for its grade band and the assets for its shot list.

### Assets and archetype libraries (US1)

Every archetype task also appends its ids to `seed/scene/archetypes.json` (API) in the same change so the drift test of T052 stays green. Each archetype ships with a Storybook story, unit test of its counts and its budget entry. Archetype cap: 10 per world per grade band.

- [ ] T070 [P] [US1] [WEB] [FR-001, FR-002] Archetypes echecs grades 1 and 2 (up to 10: `echecs.*`) with Storybook per archetype and budgets (needs: T049, T076).
- [ ] T071 [P] [US1] [WEB] [FR-001, FR-002] Archetypes echecs grades 3 and 4 (needs: T049, T076).
- [ ] T072 [P] [US1] [WEB] [FR-001, FR-002] Archetypes medecine grades 1 and 2 (needs: T049, T077).
- [ ] T073 [P] [US1] [WEB] [FR-001, FR-002] Archetypes medecine grades 3 and 4 (needs: T049, T077).
- [ ] T074 [P] [US1] [WEB] [FR-001, FR-002] Archetypes espace grades 1 and 2 (needs: T049, T078).
- [ ] T075 [P] [US1] [WEB] [FR-001, FR-002] Archetypes espace grades 3 and 4 (needs: T049, T078).
- [ ] T076 [P] [US1] [BOTH] [FR-001, FR-050] Echecs assets: about 12 backdrops and 40 cut-outs processed, tagged (`world`, `topic`, `object`, `setting`), licensed, alt fr and en, added to `seed/assets/echecs.json` and credits (needs: T008).
- [ ] T077 [P] [US1] [BOTH] [FR-001, FR-050] Medecine assets, same scope (needs: T008).
- [ ] T078 [P] [US1] [BOTH] [FR-001, FR-050] Espace assets, same scope (needs: T008).
- [ ] T079 [P] [US1] [API] [FR-005] Per world `allowed_props` and `settings` vocabulary in `seed/worlds.json` and the asset vocab, reviewed by ANIM (needs: T023).

### Content batches

Each batch has three tasks: **author** (question JSON in the world seed file, `style`, `common_errors`, `hint`, `retry_hint`, `explain`, both languages, read-aloud suitable for grade 1), **scene** (SceneSpec for every question of the batch), **review** (ANIM writes the review table rows and sets `review` on each question; `changes_requested` returns to the scene task). Batch A = difficulties 1 to 3, batch B = difficulties 3 to 5 (grade 1: 3 to 4 only, D5). Each (world, grade) ends with at least 20 and at most 24 published questions: existing grade-fit questions are reused if they pass, others retired from the seed. Skills and styles come from the matrix (T007). Review tables: `specs/001-three-worlds-premium/review/<world>-g<n>.md`.

**Echecs** (existing: g1 26, g2 30, g3 15, g4 0; new quests needed for grade 4)
- [ ] T300 [US2] [API] [FR-013, FR-011] ECH g1 batch A author (needs: T007, T014, T029)
- [ ] T301 [US1] [API] [FR-001, FR-004] ECH g1 batch A scenes (needs: T300, T070, T076)
- [ ] T302 [US1] [ANIM] [FR-003] ECH g1 batch A review (needs: T301)
- [ ] T303 [US2] [API] [FR-013] ECH g1 batch B author (needs: T300)
- [ ] T304 [US1] [API] [FR-001] ECH g1 batch B scenes (needs: T303, T070)
- [ ] T305 [US1] [ANIM] [FR-003] ECH g1 batch B review (needs: T304)
- [ ] T306 [US2] [API] [FR-013, FR-011] ECH g2 batch A author (needs: T007, T014)
- [ ] T307 [US1] [API] [FR-001] ECH g2 batch A scenes (needs: T306, T070)
- [ ] T308 [US1] [ANIM] [FR-003] ECH g2 batch A review (needs: T307)
- [ ] T309 [US2] [API] [FR-013] ECH g2 batch B author (needs: T306)
- [ ] T310 [US1] [API] [FR-001] ECH g2 batch B scenes (needs: T309, T070)
- [ ] T311 [US1] [ANIM] [FR-003] ECH g2 batch B review (needs: T310)
- [ ] T312 [US2] [API] [FR-013, FR-011] ECH g3 batch A author, operations in problem context (needs: T007, T014)
- [ ] T313 [US1] [API] [FR-001] ECH g3 batch A scenes (needs: T312, T071)
- [ ] T314 [US1] [ANIM] [FR-003] ECH g3 batch A review (needs: T313)
- [ ] T315 [US2] [API] [FR-013] ECH g3 batch B author (needs: T312)
- [ ] T316 [US1] [API] [FR-001] ECH g3 batch B scenes (needs: T315, T071)
- [ ] T317 [US1] [ANIM] [FR-003] ECH g3 batch B review (needs: T316)
- [ ] T318 [US2] [API] [FR-013, FR-011] ECH g4 batch A author, new quests and skills from the matrix, no drills (needs: T007, T014)
- [ ] T319 [US1] [API] [FR-001] ECH g4 batch A scenes (needs: T318, T071)
- [ ] T320 [US1] [ANIM] [FR-003] ECH g4 batch A review (needs: T319)
- [ ] T321 [US2] [API] [FR-013] ECH g4 batch B author (needs: T318)
- [ ] T322 [US1] [API] [FR-001] ECH g4 batch B scenes (needs: T321, T071)
- [ ] T323 [US1] [ANIM] [FR-003] ECH g4 batch B review (needs: T322)

**Medecine** (existing: g1 0, g2 39, g3 29, g4 0; new quests for g1 and g4)
- [ ] T324 [US2] [API] [FR-013, FR-011] MED g1 batch A author, new grade 1 quests, read-aloud text (needs: T007, T014)
- [ ] T325 [US1] [API] [FR-001] MED g1 batch A scenes (needs: T324, T072, T077)
- [ ] T326 [US1] [ANIM] [FR-003] MED g1 batch A review (needs: T325)
- [ ] T327 [US2] [API] [FR-013] MED g1 batch B author (needs: T324)
- [ ] T328 [US1] [API] [FR-001] MED g1 batch B scenes (needs: T327, T072)
- [ ] T329 [US1] [ANIM] [FR-003] MED g1 batch B review (needs: T328)
- [ ] T330 [US2] [API] [FR-013, FR-011] MED g2 batch A author (needs: T007, T014)
- [ ] T331 [US1] [API] [FR-001] MED g2 batch A scenes (needs: T330, T072)
- [ ] T332 [US1] [ANIM] [FR-003] MED g2 batch A review (needs: T331)
- [ ] T333 [US2] [API] [FR-013] MED g2 batch B author (needs: T330)
- [ ] T334 [US1] [API] [FR-001] MED g2 batch B scenes (needs: T333, T072)
- [ ] T335 [US1] [ANIM] [FR-003] MED g2 batch B review (needs: T334)
- [ ] T336 [US2] [API] [FR-013, FR-011] MED g3 batch A author, dosage and mass problems in context (needs: T007, T014)
- [ ] T337 [US1] [API] [FR-001, FR-004] MED g3 batch A scenes, drops count equals bound number (needs: T336, T073)
- [ ] T338 [US1] [ANIM] [FR-003] MED g3 batch A review (needs: T337)
- [ ] T339 [US2] [API] [FR-013] MED g3 batch B author (needs: T336)
- [ ] T340 [US1] [API] [FR-001] MED g3 batch B scenes (needs: T339, T073)
- [ ] T341 [US1] [ANIM] [FR-003] MED g3 batch B review (needs: T340)
- [ ] T342 [US2] [API] [FR-013, FR-011] MED g4 batch A author, new quests (needs: T007, T014)
- [ ] T343 [US1] [API] [FR-001] MED g4 batch A scenes (needs: T342, T073)
- [ ] T344 [US1] [ANIM] [FR-003] MED g4 batch A review (needs: T343)
- [ ] T345 [US2] [API] [FR-013] MED g4 batch B author (needs: T342)
- [ ] T346 [US1] [API] [FR-001] MED g4 batch B scenes (needs: T345, T073)
- [ ] T347 [US1] [ANIM] [FR-003] MED g4 batch B review (needs: T346)

**Espace** (existing: g1 0, g2 34, g3 30, g4 7; new quests for g1; clock questions need station chronometer scenes)
- [ ] T348 [US2] [API] [FR-013, FR-011] ESP g1 batch A author, new grade 1 quests, read-aloud text (needs: T007, T014)
- [ ] T349 [US1] [API] [FR-001] ESP g1 batch A scenes (needs: T348, T074, T078)
- [ ] T350 [US1] [ANIM] [FR-003] ESP g1 batch A review (needs: T349)
- [ ] T351 [US2] [API] [FR-013] ESP g1 batch B author (needs: T348)
- [ ] T352 [US1] [API] [FR-001] ESP g1 batch B scenes (needs: T351, T074)
- [ ] T353 [US1] [ANIM] [FR-003] ESP g1 batch B review (needs: T352)
- [ ] T354 [US2] [API] [FR-013, FR-011] ESP g2 batch A author (needs: T007, T014)
- [ ] T355 [US1] [API] [FR-001, FR-005] ESP g2 batch A scenes, clock questions use a station chronometer (needs: T354, T074)
- [ ] T356 [US1] [ANIM] [FR-003] ESP g2 batch A review (needs: T355)
- [ ] T357 [US2] [API] [FR-013] ESP g2 batch B author (needs: T354)
- [ ] T358 [US1] [API] [FR-001] ESP g2 batch B scenes (needs: T357, T074)
- [ ] T359 [US1] [ANIM] [FR-003] ESP g2 batch B review (needs: T358)
- [ ] T360 [US2] [API] [FR-013, FR-011] ESP g3 batch A author, operations in context (needs: T007, T014)
- [ ] T361 [US1] [API] [FR-001] ESP g3 batch A scenes (needs: T360, T075)
- [ ] T362 [US1] [ANIM] [FR-003] ESP g3 batch A review (needs: T361)
- [ ] T363 [US2] [API] [FR-013] ESP g3 batch B author (needs: T360)
- [ ] T364 [US1] [API] [FR-001] ESP g3 batch B scenes (needs: T363, T075)
- [ ] T365 [US1] [ANIM] [FR-003] ESP g3 batch B review (needs: T364)
- [ ] T366 [US2] [API] [FR-013, FR-011] ESP g4 batch A author, extend the 7 existing (needs: T007, T014)
- [ ] T367 [US1] [API] [FR-001] ESP g4 batch A scenes (needs: T366, T075)
- [ ] T368 [US1] [ANIM] [FR-003] ESP g4 batch A review (needs: T367)
- [ ] T369 [US2] [API] [FR-013] ESP g4 batch B author (needs: T366)
- [ ] T370 [US1] [API] [FR-001] ESP g4 batch B scenes (needs: T369, T075)
- [ ] T371 [US1] [ANIM] [FR-003] ESP g4 batch B review (needs: T370)

**World gates** (all four grades of the world together, owner decision 10)
- [ ] T372 [US6] [BOTH] [FR-003, FR-013, FR-050, SC-001, SC-002] Gate QA-3.echecs: media and scene validators at error level for the world, 100 percent approved reviews, quotas, matrix, `play-layout` and `play-scenes` for the world, chapter simulation of 3 chapters per grade without bank exhaustion (needs: T300 to T323, T076, T079)
- [ ] T373 [US6] [BOTH] [same] Gate QA-3.medecine (needs: T324 to T347, T077)
- [ ] T374 [US6] [BOTH] [same] Gate QA-3.espace (needs: T348 to T371, T078)

**Content order**: espace first (T348 to T371 then gate T374, which also proves the gate itself), then medecine (T324 to T347, T373), then echecs (T300 to T323, T372). The three world blocks may run in parallel by different authors once T055 passed (they touch different seed files).

---

## Phase 4: Integration, hardening, sign-off

- [ ] T400 [US6] [BOTH] [FR-050, FR-013, SC-002] Flip validators to error level in `cmd/seed`, `seedload`, admin; remove warn flags; CI runs `--report-media` with zero findings (needs: T372, T373, T374)
- [ ] T401 [US2] [API] [FR-010, FR-011, FR-014, SC-003] Turn `platform.grade_window` on in the QA environment; SC-003 distribution test on the real bank (grade 1 vs grade 4 children, fixed seeds); no pick above the child's grade; at most 15 percent below; no drill at grades 3 and 4 beyond 10 percent; FR-014 test on an existing child fixture (needs: T400)
- [ ] T402 [US3] [BOTH] [FR-020, FR-021] Turn `platform.retry_enabled` on in the QA environment; run the retry matrix on real questions across all kinds; answer-leak scan on real `hint`, `retry_hint`, `feedback` (needs: T017, T046, T400)
- [ ] T403 [US4] [WEB] [FR-030 to FR-033, SC-004] Full Playwright viewport matrix (plan section 7) on the three worlds, every question kind, fr-CA and en-CA, reduced motion, offline, resize mid-question, zoom 200 percent; evidence archived; zero findings (needs: T400)
- [ ] T404 [US1] [WEB] [FR-002, FR-053, SC-001] Performance pass over all published scenes: frame sampling at 4x CPU, budgets script, leak test over 100 scenes, lite tier on a throttled profile; fix outliers; ANIM re-review of any changed scene (needs: T400)
- [ ] T405 [US6] [BOTH] [FR-052, SC-005] Security gate: `govulncheck`, `pnpm audit --prod --audit-level=high`, admin npm audit, secret scan, role matrix rerun, parent-visible response scan, scene and media abuse tests, review of `ExportChild` for subscription data (needs: T400)
- [ ] T406 [US6] [BOTH] [FR-053] API performance gate: `cmd/loadtest` vs T002 baseline, memory, `pickCurated` p95 with final bank (needs: T400)
- [ ] T407 [US6] [BOTH] [FR-051, FR-040 to FR-045] Local production-like run: production build of web (`NEXT_OUTPUT=standalone`), API built as in CI, fresh DB, final seed, flags as shipped; run `scripts/test.sh all`, `qa/test.sh core` and `qa`, repaired `admin-propagation` for FR-044; manual child walkthrough per grade per world (needs: T401 to T406)
- [ ] T408 [US6] [BOTH] [FR-051, SC-005] Independent QA agent sign-off: `docs/QA_SIGNOFF.md` updated in both repos with scope, evidence paths, commands, results, open risks (none blocking) (needs: T407)
- [ ] T409 [US6] [BOTH] [constitution VIII] Rollout and rollback note (plan section 6) in `docs/PROD_GO_LIVE.md` addendum and the PR descriptions; flag flip order; backup procedure (needs: T408)
- [ ] T410 [OWNER] [US6] [constitution II] Owner reviews sign-off and both diffs; approves PR creation. Then, and only then, branch, commit (no AI attribution), push and open one PR per repo.

**Checkpoint QA-4** [QA, OWNER]: CI green in both repos, no open vulnerability, sign-off documents, rollout note, owner OK.

---

## Dependencies and parallelism

- Phase order: 0 then 1 and 2 (overlap after T011) then QA-1 and QA-2 then 3 then 4.
- Parallel in Phase 0: T002, T003, T004, T005, T006, T008 (then T007, T009, T010 after their inputs).
- Parallel in Phase 1 after T011: T012 to T014 (engine), T015 to T017 (retry), T018 to T021 (worlds, config, subscription), T022 to T028 (scene and validators); inside each lane tasks are ordered by "needs". T019, T020, T028, T030, T031 are [P].
- Parallel in Phase 2: layout lane (T041 to T045), retry and flow lane (T046, T047, T048), scene lane (T049 to T055), parent and admin lane (T056 to T061 are [P] with each other).
- Parallel in Phase 3: T070 to T079 all [P]; world blocks (ECH, MED, ESP) are independent of each other (separate seed files); inside a world, grades are independent; inside a batch the order author, scenes, review is strict; a review with `changes_requested` reopens the scenes task.
- Never parallel: contract T011 before any code that uses it; T055 pilot before Phase 3 volume; T400 only after all three world gates; T401 and T402 only after T400; T410 last.

## Test and QA checkpoint summary

| Checkpoint | After | Evidence |
|---|---|---|
| QA-0 | T001 to T010 | repro tests red, baseline.md |
| QA-1 | T031 | Go tests with race, authz matrix, loadtest, golden payloads with flags off |
| QA-2 | T062 and T055 | pilot review records, frame sampling, a11y, layout suite green |
| QA-3.w | T372, T373, T374 | validators error level, 100 percent approved reviews, quotas, matrix, chapter simulation |
| QA-4 | T410 | CI green, sign-off docs, rollout note, owner OK |

## Implementation strategy

1. Finish Phase 0 and get the owner decisions. 2. Land the contract, then the API foundation behind flags. 3. Build layout and retry in the web while the scene core is built; make the layout suite green. 4. Prove the whole scene pipeline with the three-scene pilot. 5. Produce content world by world with the batch loop, gating each world with all four grades together. 6. Flip flags in the QA environment, run the full matrix, harden, sign off, and hand to the owner. Nothing is committed or pushed by these tasks.
