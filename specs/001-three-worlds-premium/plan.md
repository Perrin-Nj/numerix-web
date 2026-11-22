# Implementation Plan: Three Premium Worlds, Grade-True Play, Parent and Admin Fixes

**Branch**: `feat/three-worlds-sdd` (web) and the matching branch in `numerix-api` | **Date**: 2026-11-17 | **Spec**: `specs/001-three-worlds-premium/spec.md`
**Inputs**: spec.md (owner decisions binding), research.md (root causes, amendments SA-1 to SA-13, decisions D1 to D7)
**Delivery**: one PR per repo, QA sign-off before merge, no push without owner approval. No AI attribution lines (CLAUDE.md rule 9, constitution II).

## Summary

Make the three default worlds (`echecs`, `medecine`, `espace`) premium for grades 1 to 4: every published question gets its own data-driven **photographic diorama scene** (CSS 3D layers of real photographs plus procedural light and particles) bound to the question's real numbers and approved by an animation expert before publish; the engine becomes grade-true (strict grade window, style `drill|context`, curriculum matrix); one gentle retry that never touches mastery; layout rebuilt so the question never disappears or jumps from 320 to 3840 px including screen-share sizes; parent and admin fixes (neutral plan wording with admin-only free access, calmer profile cards with an obvious delete, switch rows, inactive new worlds, `home_sections` admin toggle); a media/scene/review validator that makes a mismatch unpublishable. Work is spec-driven, test-first, and ordered so the engine and validators exist before content, and a pilot of three scenes proves the pipeline before 240 scenes are produced.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16 (web, `Services/frontend`, admin in `admin/`); Go 1.22+ (`Services/numerix-api`, module `github.com/Perrin-Nj/numerix-api`)
**Primary Dependencies**: web: Tailwind, Radix (`ui/` only), next-intl, TanStack Query, `motion` 14.14 (already installed), `canvas-confetti`; no new runtime dependency planned. api: stdlib, oapi-codegen (`api/api.gen.go`), SQLite (modernc or mattn as already used), embedded seed JSON.
**Storage**: SQLite (migrations `internal/store/migrations`, next number 0013), seed JSON (`seed/questions/*.json`, `seed/worlds.json`, `seed/assets`), appconfig documents (versioned JSON)
**Testing**: Vitest and Storybook tests, node check scripts (`scripts/check-*.mjs`), Playwright through `scripts/test.sh` (modes `play`, `mobile`, `nav`, `ui`, new `layout`, `scenes`), `go test ./... -race`, `cmd/seed --validate-only`, `qa/` harness, govulncheck, `pnpm audit`
**Target Platform**: PWA on mobile web (iOS Safari 16+, Android Chrome 110+, in-app WebViews), tablet, desktop, TV browsers (1920 and 3840 wide), screen-shared windows
**Project Type**: web application: frontend + admin + API
**Performance Goals**: scene rendering at 60 fps on a mid phone (measured at 4x CPU throttle: at most 5 percent of frames above 20 ms over a 10 s window); no API p95 or memory regression versus baseline (T002)
**Constraints**: photographic art only (SA-1); scene budgets below; offline-capable (assets precached by the service worker per world pack); reduced motion honoured; no timers or hurry words in child copy; bilingual fr-CA and en-CA; layer arrows in `docs/ARCHITECTURE.md` (game may import ui, platform, shared, config, i18n)
**Scale/Scope**: 3 worlds x 4 grades, at least 240 questions each with a scene spec and a review record; about 36 backdrops and 120 cut-outs; two repos, about 14 changed endpoints/fields

## Constitution Check

| Principle | Plan response | Status |
|---|---|---|
| I Spec first | spec.md, research.md, plan.md, tasks.md, analysis.md before any code; every task carries FR ids | pass |
| II Owner authority | one PR per repo, QA document, no commit or push in this stage, no AI attribution | pass |
| III Child safety and tone | no timers, em dashes or emoji in copy (`check-copy.mjs`); scene validator forbids contradicting props (FR-005); retry hint never contains the answer | pass |
| IV Questions are the product | per-question scene spec with a signature uniqueness rule; generic scene families only as a non-published fallback | pass |
| V Grade-true difficulty | strict window, `style` rule, matrix; amendments SA-2, SA-5 keep the principle while fixing the skill-id reading of FR-011 | pass with SA-5 (drills by style) |
| VI Test before trust | repro tests first (T003 to T005), viewport matrix, per-question expert review, independent QA | pass |
| VII Security, performance, accessibility | new admin endpoints role checked and audited; budgets and frame sampling; `role=img` descriptions; reduced motion stills; keyboard operable | pass |
| VIII Safe rollout | additive migration 0013 only; legacy answer clients unchanged; strict grade window behind a flag until content gate; existing `child_settings` untouched | pass |

Re-check after design: no violation. One tension recorded in Complexity Tracking (new scene subsystem vs "reuse components aggressively").

## Project Structure

### Documentation (this feature)

```text
specs/001-three-worlds-premium/
├── spec.md              # owner decisions (binding)
├── research.md          # Phase 0: findings, amendments, decisions
├── plan.md              # this file (data model, contracts, quickstart notes inline, see 5 and 6)
├── tasks.md             # ordered tasks
├── analysis.md          # coverage and consistency report
├── curriculum.md        # produced by T006 (cited Quebec sources)
├── baseline.md          # produced by T002
└── review/              # produced during content: <world>-g<grade>.md, one table per world and grade
```

### Source Code (real paths)

```text
# Web repo: Services/frontend
src/game/scene-stage/             NEW  Storybook-first widget
  SceneStage.tsx                  renderer (stage, layers, camera, light, reveal)
  spec.ts                         SceneSpec types and pure validators (node-runnable, no imports)
  bind.ts                         resolved numbers -> counts, groups, labels (pure)
  clock.ts                        single rAF driver, pauses on hidden tab, frame sampling hook
  describe.ts                     accessible description from the resolved spec (fr, en)
  fx/Particles.ts                 2D canvas dust, glints, soft shadow; capped
  rig.css                         perspective, preserve-3d, layer classes, reduced-motion rules
  archetypes/index.ts             registry: archetype id -> dynamic import
  archetypes/echecs/*.tsx  archetypes/medecine/*.tsx  archetypes/espace/*.tsx
  SceneStage.stories.tsx          one story per archetype, ok and ko reveal, reduced motion, 320 and TV
src/game/story-panel/StoryPanel.tsx             rewritten layout (rows, svh, short-height mode)
src/game/question-input/Keypad.tsx              focus and scroll containment
src/game/switch-row/                            NEW (FR-042)
src/game/child-card/                            NEW (FR-041)
src/features/play/StoryScreen.tsx               compose scene-stage, retry, previous reveal, coach slot
src/features/play/story-machine.ts              attempt state, lastReveal
src/features/play/HomeFeed.tsx  PlayShell.tsx  WorldsScreen.tsx
src/features/parent/ParentHome.tsx ChildOverview.tsx SettingsScreen.tsx
src/game/subscription-badge/  src/features/common/SubscriptionPill.tsx  src/features/parent/subscription/  src/features/notify/reminders.ts
src/data/api/ (types, hooks: attempt, retry, home_sections)  contracts/openapi.yaml  contracts/BACKEND_REQUIREMENTS.md
admin/src/app/(app)/{parents,children,feed,config,questions}  admin/src/components/qpreview.tsx
scripts/lib/viewports.mjs  scripts/play-layout.mjs  scripts/play-scenes.mjs  scripts/check-scene-spec.mjs  scripts/check-scene-budget.mjs  scripts/test.sh (modes)

# API repo: Services/numerix-api
internal/content/types.go validate.go scene.go(NEW) media_rule.go(NEW) review.go(NEW)
internal/contentdb/pick.go                       window, rank, review share
internal/engine/planner.go registry.go bkt.go    grade-true skill choice, priors
internal/app/game_answer.go game_session.go content_play.go     retry, scene in beat, picker call
internal/app/platform_children.go platform_billing.go platform_common.go  world registry, neutral subscription, inactive worlds
internal/adminapi/children.go parents.go content.go appconfig.go worlds.go(NEW?)
internal/appconfig/docs.go public.go             Feed.home_sections, Platform.default_worlds
internal/store/migrations/0013_answer_retries.sql
api/openapi30.yaml  api/api.gen.go
seed/worlds.json  seed/questions/{echecs,medecine,espace}.json  seed/curriculum/matrix.json  seed/assets/*.json
cmd/seed (report mode)  README seed/README.md
```

**Structure Decision**: web app with two repos and the existing admin sub-app. New code is confined to one new game widget (`scene-stage`), two small widgets (`switch-row`, `child-card`), and focused edits in existing files. No new service, no new database, no new runtime dependency.

## 1. Delivery order (summary)

1. **Phase 0 Decisions, baselines, repro tests, research** (nothing ships): owner decisions D1 to D7; baseline metrics; failing tests that prove the bugs; curriculum research; asset sourcing starts (longest lead).
2. **Phase 1 API foundation** (Go): contract first, then difficulty, retry, worlds, appconfig, subscription neutralisation, validators (scene, media, review), per-grade quotas as warnings.
3. **Phase 2 Web foundation** (can run beside Phase 1 after the contract task): layout rewrite, retry UI, previous reveal, scene-stage engine, pilot of 3 scenes and a pilot review round, parent and admin UI.
4. **Gate QA-2: pilot passes the whole pipeline** (authoring, validation, render, perf, a11y, expert review, publish) before volume work.
5. **Phase 3 Content by world x grade** (24 batches of about 10 questions; each batch = author, scene specs, expert review). Order: espace, medecine, echecs (espace has the most grade 3 and 4 material and the clock case).
6. **Phase 4 Integration QA**: full viewport matrix with real content, grade distribution test, flip validators from warn to error, strict grade window on, security and performance gates, local production-like run, independent QA sign-off, owner review, PR preparation.

Details and task ids are in tasks.md.

## 2. Architecture: per-question 3D scene system

### 2.1 Concept

A **scene** is a small photographic diorama assembled from a registered **archetype** (a composition recipe for one kind of moment, e.g. "capsule docking approach", "chess board with captured pieces lined up", "vial filling under a lamp") and a **spec** (the question's own parameters). The archetype is code (reviewed once, lazy loaded). The spec is data (per question, validated, reviewed, hashed).

```
question JSON (seed or admin)
   └ scene: SceneSpec  ── server resolves bindings ──►  beat.question.scene (resolved numbers, asset urls)
                                                         │
SceneStage ◄── archetype chunk (dynamic import) ◄────────┘
   ├ backdrop layer   photo, depth 0.0, slow parallax
   ├ mid layers       alpha cut-outs on translateZ planes (props, count n)
   ├ foreground       blurred cut-out or particles (canvas), depth 1.0
   ├ light layer      gradient key light, light sweep, contact shadows (CSS)
   └ choreography     idle -> entrance -> (answer) reveal-ok | reveal-ko
```

### 2.2 SceneSpec v1 (data model, stored in the question JSON)

```json
"scene": {
  "v": 1,
  "archetype": "espace.dock-approach",
  "setting": "station",
  "subjects": ["capsule", "crew"],
  "bind": {
    "n1": { "from": "calc", "index": 0 },
    "n2": { "from": "math_text", "index": 1 },
    "total": { "from": "answer", "reveal_only": true }
  },
  "props": [
    { "id": "caps", "asset": "cut_a1b2", "count": "$n1", "layout": "grid", "lane": "mid", "seed": 7 },
    { "id": "arm",  "asset": "cut_c3d4", "count": 1,     "layout": "line", "lane": "front" }
  ],
  "backdrop": { "asset": "a_9f31..." },
  "camera": { "preset": "dolly-in", "tilt_deg": 6, "drift": "slow" },
  "light": { "key": "warm-left", "fx": ["dust", "glint"] },
  "hook": { "kind": "light-sweep", "at_ms": 350 },
  "reveal": { "ok": "settle-glow", "ko": "slide-back" },
  "alt": { "fr": "Quatre capsules alignees devant la station.", "en": "Four capsules lined up in front of the station." }
}
```

Rules enforced server side (`internal/content/scene.go`, hard errors unless stated):

- `archetype` exists in the registry list shipped with the API (`seed/scene/archetypes.json`, same ids as the web registry; a drift test compares both lists, see T052).
- `bind.from` one of `calc` (term by index of the parsed `calc`), `math_text` (number by index, parsed by the server with locale rules), `visual` (JSON pointer into `visual.data`), `items`, `choices`, `answer` (only with `reveal_only: true`; never allowed in `entrance`). Every resolved value must appear in story, prompt, `math_text`, options, items, visual data or `calc` (provenance rule, FR-004).
- `props[].count` is a literal 0 to 60 or `$name`; above 60 the archetype must declare `grouping` (tens rods with a numeric label); silent clipping is an error (FR-004).
- `props[].asset` and `backdrop.asset` must exist, be `approved`, be `people_free` and `brand_free`; media rule R1 to R5 below.
- `subjects` and prop `object` tags must be in `world.allowed_props` or named in the question text (FR-005).
- Budget fields: at most 8 layers, at most 60 prop instances, spec JSON at most 4 KB, summed asset weight at most 120 KB, backdrop 960 px at most 45 KB, each cut-out at most 12 KB (webp or avif with alpha). The validator reads asset `variants` sizes.
- `alt` required fr and en (or generated by `describe.ts` from the resolved spec; chosen at T049, default: required and validated against resolved numbers: every number in `alt` must be a resolved value).
- Uniqueness: signature (archetype, subjects, layout set, camera preset, light key, hook kind, reveal ids) unique per quest; archetype used by at most 3 questions per (world, grade) (warning below 120 questions, error at the content gate).

### 2.3 Rendering approach and budgets

- **CSS 3D**: container `perspective: 900px`, `transform-style: preserve-3d`; each lane at `translateZ` (back -120, mid 0, front +80 px) so real parallax appears under a gentle camera drift (idle) and on pointer or device tilt (`useTilt`, off by default on iOS until permission, never required).
- **Only compositor properties animate**: `transform` and `opacity`. No animation of layout properties, no `filter` animation except one static blur on the foreground, no `backdrop-filter` inside the stage (Safari bug class).
- **Canvas 2D** for dust, glints, drops, light sweeps masks: one canvas, devicePixelRatio capped at 2, at most 150 particles, paused when the tab is hidden or the stage is out of view (IntersectionObserver), stopped in reduced motion.
- **One clock**: `clock.ts` owns a single `requestAnimationFrame` loop; archetypes register tick callbacks; the loop stops at idle when nothing moves. Frame sampling hook (`window.__nxFrames`) is only enabled with a `?perf=1` flag and in Playwright.
- **Low-end path**: `navigator.hardwareConcurrency <= 4` or `deviceMemory <= 2` or measured jank (3 consecutive frames above 33 ms in the first second) switches to the **lite tier**: no canvas, no foreground layer, 3 layers max, drift off. Lite tier still shows every prop and count (information is never lost).
- **Reduced motion** (`useReducedMotion`): static composition, entrance and reveal replaced by a 150 ms opacity cross-fade, no drift, no particles, no hook animation; the same DOM so the review stills are identical to the reduced-motion render.
- **Assets**: backdrop and cut-outs served through the existing `MediaImage`/asset store (`/assets/...` with `srcset`), lazy per scene, the next beat's scene is **preloaded** while the child reads the reveal (extension of `preloadMedia`). Per-world asset pack is added to the service worker precache list on first visit to the world (cap 6 MB per world), so offline play keeps scenes.
- **Bundle budgets** (enforced by `scripts/check-scene-budget.mjs`, gzip): scene-stage core at most 25 KB; each archetype chunk at most 12 KB; first-load JS of `/play/session/[id]` grows by at most 3 KB (the core loads lazily after the question text). Per-scene runtime: at most 250 DOM nodes, at most 8 composited layers, GPU texture total at most 2.5 megapixels, JS heap growth at most 8 MB per scene and zero growth after unmount (leak test over 30 scenes).
- **Accessibility**: the stage is `role="img"` with `aria-label` = `alt` of the resolved spec; props are `aria-hidden`; no information only by motion (the count is visible at rest and in the label); reveal outcome is also text (existing sheet); no flash above 3 Hz; contrast of any text on the stage 4.5:1 (no text on the stage by default); keyboard: the stage is not focusable; "replay animation" is a button (Enter and Space) for children who missed it, hidden in reduced motion.
- **Failure**: archetype chunk fails to load or asset 404 -> the stage falls back to the question's `visual` or the generic `ScenePicture` and reports through `reportError` (no silent errors, a small non-blocking notice only in dev builds; child sees a calm static picture).

### 2.4 Integration into the play screen

`StoryScreen` currently composes `IllustrationFrame` with one of `QuestionVisual`, `ScenePicture`, `MethodVisual`. New composition for questions that have `question.scene` (the three worlds):

1. **Question phase**: `SceneStage` in the stage slot (entrance then idle). If the question also has a `visual` the child must read (graph, clock, grid), the visual is **embedded as a layer of the scene** (`visual` prop: the existing `QuestionVisual` rendered on a physical board plane in the scene) so the stage still has exactly one picture.
2. **Outcome phase**: same `SceneStage` plays `reveal.ok` or `reveal.ko` using `correct_answer` for `reveal_only` bindings; then `MethodVisual` as today (the how-to) when the server sent one.
3. Questions without `scene` (other 17 worlds, generated questions) keep the current stage unchanged.
4. Reducer additions: `lastReveal`, `attempt`, `retryHint` (see 3.3 and 3.4).

### 2.5 Review protocol (animation expert, per question)

Roles: author agent (writes spec), animation expert reviewer (a different agent), layout QA. The author never approves.

Evidence generated by `scripts/play-scenes.mjs --world <w> --grade <g>` per question, stored under `specs/001-three-worlds-premium/review/evidence/<question-id>/` (not committed if large; hashes and a contact sheet are committed):
- frames at t = 0, 400 ms, 1200 ms (idle), reveal-ok mid and end, reveal-ko mid and end at 360x740 and 1280x720, plus a reduced-motion still;
- resolved spec, counted DOM props, the frame-time summary at 4x CPU, DOM node count, asset weights;
- a contact sheet placing this scene beside the 3 nearest neighbours (same quest and previous/next in the chapter) to judge uniqueness.

Checklist (every row is pass, fail or n/a with a one-line reason):

| # | Criterion | Pass rule |
|---|---|---|
| 1 | Match | every number, object and relation of story, prompt and `math_text` is visible and correct; no prop contradicts the story or the world |
| 2 | Uniqueness | signature differs from every other question in the quest and world; contact sheet shows a recognisably different composition and hook |
| 3 | Hook | within 400 ms something purposeful draws the eye to the key quantity (light sweep, depth reveal, move) |
| 4 | Readability | the question text and choices are never covered; foreground never hides counted props; counts are countable at rest at 360 px |
| 5 | Motion quality | entrance at most 1.6 s, reveal ok at most 1.2 s, reveal ko gentle (no shake, no red), easing from tokens, no flashing above 3 Hz, idle loop subtle |
| 6 | Reduced motion | static still carries all information; no motion remains |
| 7 | Accessibility | label states the quantities; no information only by motion; contrast of any overlay |
| 8 | Performance | at most 5 percent of frames above 20 ms at 4x CPU; nodes, layers, bytes within budget |
| 9 | Teaching | reveal reinforces the explanation, not just celebrates; wrong answer reveal shows the correct situation without blame |
| 10 | Tone | no timer, hurry word, emoji, cartoon; photographic only |

Record format (`review/<world>-g<grade>.md`, one row per question) and the machine copy on the question:

```text
| question id | signature | scene_hash | author | reviewer | date | status | criteria failed | notes |
| espace.decompte.004 | espace.dock-approach/capsule+crew/grid/dolly-in/warm-left/light-sweep | 9f31c2 | agent-A | agent-R | 2026-12-02 | approved | none | counts 39 then 40 |
```

Statuses: `draft` -> `in_review` -> `changes_requested` -> `approved` or `rejected`. Any edit to the scene (hash change) resets to `in_review` (validator enforces by comparing `scene_hash`). `SC-001`: CI counts approved records equal published questions in the three worlds.

## 3. Design by requirement group

### 3.1 Layout, scroll and screens (FR-006, FR-030 to FR-033)

Rewrite `StoryPanel` (the only user is `StoryScreen` and its stories):

- Structure as CSS grid: `grid-template-rows: auto minmax(0, 1fr) auto` for header (top bar), content, input; the section is `min-height: 100svh` with `100dvh` only as progressive enhancement. No `h-dvh` hard cap; the page may scroll as a last resort so nothing is ever clipped.
- Stage height is `clamp(120px, 28svh, 38svh)` with an absolute minimum; **no height transitions** (use `transform`/`opacity` for emphasis). The outcome sheet does not resize the stage: the stage stays and the sheet overlays the input area (`position: sticky` bottom inside the grid), removing the 38 to 15 dvh jump.
- **Height-aware modes**: `@media (max-height: 520px)` or container query on the section: two columns (stage left 45 percent, text and input right) even when narrow (landscape phone, 600x400 shared windows). Below 360 px wide and 480 px tall, the stage shrinks to a thumbnail strip with a "see picture" button; text and input remain primary.
- The question block (`data-question`) is outside the scroll region and `position: sticky` under the stage; the narration scrolls in its own region with `overscroll-behavior: contain`; when content exceeds the region a visible scroll hint appears; story text uses larger type token (`text-xl md:text-2xl`) and a left rule to be visually distinct (FR-006).
- **Single coach slot**: hint, coach hint and mascot line share one slot rendering only the latest message (replace, not stack); slot has fixed min-height 3.5 rem to avoid jump; on `lg` the mascot line stays in the side column.
- Streaming text: reserve space for the final text length when known; for generated scenes use `min-height` equal to the last rendered height (monotonic grow only, never shrink) to avoid jump.
- Keypad: buttons use `touch-action: manipulation`, `onPointerDown preventDefault` to avoid focus scroll, focus ring kept via `:focus-visible`, container `overscroll-behavior: contain`; no layout change on key press; the answer display has fixed width digits (`tabular-nums`, min-width for 9 characters).
- Fixed top bar uses `env(safe-area-inset-top)` already; add `scroll-padding-top` equal to bar height.

Repro first (T005): the suite must fail on the current code for at least the 600x400, 1024x400 and 320x568 profiles, then pass after T041 to T044.

### 3.2 Difficulty by grade (FR-010 to FR-014)

Algorithm (all in Go, deterministic, flag `grade_window` default off until the content gate):

1. `gradeOf(child)`: null or 0 -> 1 (D6). Parent app prompts for the grade.
2. `Choose` (planner): eligible skills = those in the world's quests with `PlayableFor(world, id, grade)` where playable counts only candidates in the window `[grade-1, grade]`; for a new skill choose the one whose `[annee_intro, annee_maitrise]` contains `grade` and whose `annee_intro` is closest to `grade` (replaces "earliest year first"); `IsBankOnly` no longer bypasses the year.
3. `Candidates`: `b.grade BETWEEN ? AND ?` with the window computed in Go (`grade-1..grade`), plus `style` filter: for grade >= 3 `style = 'context'` except the drill review share.
4. `Rank`: keys `[sameType, gradePenalty, |difficulty - target|, hash]` with `gradePenalty = 0` for the child's grade and `1` for grade-1 candidates; the review share is decided first by `hash(childID, beatIndex) mod 100 < 15` (deterministic, so a reload does not change the pick) and only chooses from grade-1 candidates if any exist, else normal.
5. `target`: `TargetDifficulty(mastery)` where an unseen skill's prior mastery = `clamp(0.25 + 0.15 * (grade - annee_intro), 0.25, 0.6)` so a grade 4 child on a grade 3 skill starts around difficulty 3, a grade 1 child on a grade 1 skill around 2. Constants live in `appconfig.Platform` (`grade_prior_base`, `grade_prior_step`) so tuning needs no deploy; defaults above.
6. Tests: `SC-003` distribution test (seeded fake children grades 1 and 4, 200 picks each from a fixture bank): mean difficulty and mean grade differ with fixed thresholds; no pick with `grade > child grade`; at most 15 percent picks below the child's grade; no `drill` for grades 3 and 4 beyond 10 percent.
7. `FR-014`: only `NextBeat` changes; served `questions` rows and `child_questions` are untouched; a unit test serves a beat under the old rules, flips the flag, and asserts the open beat is returned unchanged ("a retry gets the same beat" path).
8. Chapter repeat: `reserveBank` (re-serve oldest) stays as the last resort but logs a metric `bank_exhausted{world,skill,grade}`; the content gate requires zero exhaustion in the QA simulation of 3 chapters per child per grade.

Curriculum matrix: `seed/curriculum/matrix.json` rows `{grade, strand, skill, difficulty_range, style, source_ref}`; a Go test loads the three worlds' quests and asserts each question's `(grade, skill, style, difficulty)` is allowed by the matrix; `curriculum.md` cites the sources (T006).

### 3.3 Retry (FR-020 to FR-022)

API (see 4 for schema):

1. `POST /sessions/{s}/beats/{b}/answer` accepts `attempt` (1 default, 2). Legacy clients omit it: behaviour byte-for-byte as today (full reveal on first answer).
2. The client opts in by sending `attempt: 1` explicitly; the server then returns the withheld result only when the outcome is not `correct`, the question type allows retry (SA-11), and `platform.retry_enabled` is true. Fields: `attempt: 1`, `retry_available: true`, `outcome`, `session`, `rewards: []`; `correct_answer`, `explain`, `method_visual`, `feedback` are absent. Mastery observed now (first attempt).
3. `attempt: 2`: requires the first answer row; stored in `answer_retries`; no `Observe`; returns the full reveal (`correct_answer`, `explain`, `method_visual`) plus `outcome` of the retry and `attempt: 2`. Rewards: a correct retry counts 0.5 in the card threshold computation; `chapter_complete` unchanged.
4. Idempotency: same key replays the stored result for that attempt; another key after the row exists -> `409 beat_answered`; `attempt: 2` after correct or without a first answer -> `409 retry_not_allowed`; `attempt: 2` on a session no longer active -> existing `session_completed`/`session_paused`.
5. Hint: `POST .../hint` allowed once in the window "answered wrong, retry not yet used" and returns `retry_hint`: `common_errors[].feedback` matched on the first wrong value (stored in `answers.json` as `given`), else the question `hint`, else a skill-level nudge from `internal/app` canned map; validator extended: `hint`, `retry_hint` and `common_errors[].feedback` never contain the correct answer (digits or number words) (FR-020).
6. Web: reducer state `attempt: 1 | 2`, new phase `retrying` between `answering` and `outcome`: UI shows a calm "Essaie encore" with the hint in the coach slot, the wrong choice disabled (choice) or the entry cleared (keypad), the scene replays a gentle "again" idle (no ko reveal yet). After attempt 2 the normal reveal (stage plays ok or ko, sheet, continue). Reward line: smaller burst (confetti particleCount 12), streak unchanged. Copy bilingual, no red, no "wrong" word, no timer.
7. Previous reveal (FR-022, SA-9): `lastReveal` stored on `CONTINUE`; button "Revoir la reponse precedente" visible in the question phase from question 2; opens a read-only dialog with the previous stage still, explanation and correct answer; Escape closes; not persisted.

### 3.4 Parent and admin (FR-040 to FR-045)

- **Free access** (FR-040, D1): `subscriptions.json` gets `free_access {granted_by, granted_at, until, reason}` (JSON, no schema change). New admin endpoint `PUT /admin/v1/parents/{id}/free-access` (role check = existing admin auth, audit entry with before and after, body validation: `until` future date or null, reason 1 to 200 chars). Parent-facing `GET subscription`: when `status = trial` or `free_access` present, respond `status: "active"`, `trial_ends_at: null`, `days_left: null`, `can_play` real; `renews_at` replaced by `access_until` (new optional field, shown neutrally per SA-10). Web removes trial strings (`game.subscriptionBadge.trial`, `notify/reminders.ts` trial branch), `SubscriptionPill` days badge, and keeps `expired`. `check-copy.mjs` gains a banned-words list for parent and child bundles (`essai`, `gratuit`, `trial`, `free`) excluding the admin app. Admin UI: parent detail page gets "Free access" panel with real status.
- **Profile cards** (FR-041): new tokens `--radius-card: 6px`, `--radius-control: 8px` in `styles/tokens.css`; `child-card` widget: avatar (circle), name, grade, consent and PIN chips (rectangular, `--radius-sm`), primary "Open", secondary "Settings", overflow-free **visible** "Delete profile" text button at the card bottom (danger tone, icon + label, 44 px) opening the existing typed-confirmation dialog extracted from `SettingsScreen` into a shared `DeleteChildDialog`. Used in `ParentHome` and as the header of `ChildOverview` (one component). Storybook before and after for owner review.
- **Switch row** (FR-042): `switch-row` widget: whole row is the label (click target), layout `[switch][label + description]` left aligned, `On`/`Off` text, 48 px min height, `max-width: 28rem`, grid `repeat(auto-fit, minmax(16rem, 1fr))`; used in world toggles first and then adopted by the other settings switches (one pass, no duplicate).
- **New worlds** (FR-043): `seed/worlds.json` entries with `status: "draft"`, `ord` 21 to 23, accents, grades 1 to 6 range, hero asset placeholder; `plWorldIDs` and `adminapi.worldIDs` both replaced by the DB-backed registry `worlds.status`; contract `WorldId` enum +3; web `WORLD_BG`, `ITEMS`, i18n `worlds.*` entries; admin worlds page lists all with status switch (`PUT /admin/v1/worlds/{id}/status` published|draft, audited). Child and parent endpoints list `published` only; `StartSession`, `GetJourney`, `UpdateChildSettings` (parent role) reject `draft` with `422 world_inactive`. An admin turning a world to `published` makes it appear in parent toggles (still default off per child).
- **Home sections** (FR-044, D2): `Feed.home_sections {challenges, discover, daily_quest}` default false; `publicFeed` includes it; web `HomeFeed` renders the three blocks conditionally; nav per D2. Admin feed page gets three switches (reuse `switch-row` adapted for admin or the admin's own `ui.tsx`). Public config cache is 60 s so the toggle propagates within a minute (documented).
- **Default worlds** (FR-045): `Platform.default_worlds` (appconfig, validated against published worlds, default the three), used by `plDefaultSettings`, `enabledWorlds`'s fallback and `adminapi.defaultSettings`. Existing children's stored settings are never rewritten.

### 3.5 Validators (FR-003, FR-004, FR-005, FR-050)

New files in `internal/content`: `scene.go` (2.2 rules), `media_rule.go`, `review.go`. `Env` gets `AssetMeta func(ref string) (AssetMeta, bool)` (kind, tags by facet, review_status, people_free, brand_free, variants bytes, alt) and `World func(id string) WorldMeta` (allowed props, requires_scene). Rules:

| Id | Rule | Level |
|---|---|---|
| M1 | `scene` media: asset world tag equals the question world; setting tag equals `scene.setting` or is `generic` | error |
| M2 | `object` media: asset `object` tag equals the `props[].object` it depicts and that equals the counted noun of the question (from `subjects`) | error |
| M3 | no asset tag listed in the question's `forbidden` or outside `world.allowed_props` unless named in text | error |
| M4 | the displayed count of an `object` prop equals the bound resolved number | error (also frontend test) |
| M5 | one asset used by more than 15 percent of the questions of the world | warning, error at content gate |
| M6 | asset `review_status = approved`, `people_free`, `brand_free`, `alt_fr` and `alt_en` present | error |
| S1 to S7 | scene rules of 2.2 (archetype, bind provenance, counts cap, vocab, budgets, uniqueness, alt numbers) | error (S6 warning until gate) |
| R1 | `status = published` in a scene world requires `scene` and `review.status = approved` and `review.scene_hash = hash(scene)` | error |
| Q1 | per (world, grade) quotas of SA-6 | warning, error at gate (flag) |
| T1 | `style` present; grade >= 3 `drill` limited to 10 percent per quest | error |

The same `content.Validate` is called by `cmd/seed --validate-only`, `seedload`, and `adminapi/content.go` create/update/publish (check that admin PUT routes call it; add where missing). `cmd/seed --report-media` prints one line per media: question id, asset, role, decision, rule. CI (API) runs it as a step (SC-002: zero errors).

## 4. API changes and contracts

All changes are additive (constitution VIII). `api/openapi30.yaml` and `frontend/contracts/openapi.yaml` change in the same pair of PRs (CLAUDE.md 6), then `api/api.gen.go` and `src/data/api/schema.d.ts` are regenerated.

| # | Endpoint or schema | Change | Backward compatibility |
|---|---|---|---|
| C1 | `AnswerRequest` | add optional `attempt` (integer enum 1, 2; absent = legacy) | legacy unchanged |
| C2 | `AnswerResult` | add `attempt`, `retry_available` (bool), `retry_hint?`; make `correct_answer` optional (absent only when `retry_available`) | old clients never send `attempt`, so never see the withheld form |
| C3 | `POST .../hint` | allowed in the retry window; response adds `kind: "hint" or "retry_hint"` | additive |
| C4 | `Question` (beat) | add `scene` (resolved SceneSpec: archetype, resolved numbers, asset media refs, alt, camera, light, hook, reveal) and `style`; never `bind` sources or answers | additive, optional |
| C5 | `WorldId` enum | add `histoires-africaines`, `english`, `francais` (or the D4 id); `GET /worlds` returns `published` only for child and parent tokens | clients already treat unknown ids as generic |
| C6 | `SubscriptionView` | parent and child tokens: `status` never `trial`, `trial_ends_at` and `days_left` null, add optional `access_until` | same fields, neutral values |
| C7 | `AppPublicConfig.feed` | add `home_sections {challenges, discover, daily_quest}` | additive; missing = false |
| C8 | admin: `PUT /admin/v1/parents/{id}/free-access` | new, role admin, audited | new |
| C9 | admin: `PUT /admin/v1/worlds/{id}/status` | new, audited | new |
| C10 | admin: `PUT /admin/v1/appconfig/platform` | `default_worlds`, `grade_prior_base`, `grade_prior_step`, `retry_enabled` | through existing config editor; defaults keep today |
| C11 | admin question schema | `scene`, `style`, `review`, `retry_hint` | optional fields |
| C12 | error codes | `retry_not_allowed` (409), `world_inactive` (422) | new codes, `KNOWN` list in web updated |

Admin openapi (`contracts/openapi.admin.yaml`) updated for C8 to C11.

## 5. Data model

**SQLite**

- `0013_answer_retries.sql`:
  ```sql
  CREATE TABLE answer_retries (
      beat_id         TEXT PRIMARY KEY REFERENCES beats(id) ON DELETE CASCADE,
      session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      idempotency_key TEXT NOT NULL,
      outcome         TEXT NOT NULL,
      json            TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX idx_answer_retries_session ON answer_retries(session_id);
  ```
- Optional index (only if `EXPLAIN QUERY PLAN` shows a scan): `CREATE INDEX idx_bank_pick ON bank_questions(world_id, skill_id, status, grade, difficulty);` in the same migration file.
- `bank_questions.content_json` already stores the whole question; `scene`, `style`, `review`, `retry_hint` live inside it (versioned by the existing `question_versions`). No column change.
- `worlds`: rows inserted by the seed loader with `status = 'draft'` (CHECK already allows it). No DDL.
- `subscriptions.json` extra key `free_access` (JSON in the existing column). No DDL.

**Question JSON additions** (Go `content.Question`): `style` (`drill|context`), `scene` (2.2), `retry_hint` (LText, optional), `review {status, reviewer, scene_hash, reviewed_at}`.

**Seed files**: `seed/curriculum/matrix.json`, `seed/scene/archetypes.json` (id list with world, max props, layers), `seed/worlds.json` (+3), `seed/assets/<world>.json` (+backdrops, +cut-outs with `kind: cutout`, `has_alpha`, `object` tags), `seed/questions/{echecs,medecine,espace}.json` rewritten.

**Appconfig**: `Feed.home_sections`; `Platform.default_worlds`, `retry_enabled`, `grade_window`, `grade_prior_base`, `grade_prior_step`. All have code defaults; missing keys in stored JSON take defaults.

## 6. Migration and rollback

| Change | Forward | Rollback |
|---|---|---|
| 0013 `answer_retries` | additive table, no data copy | leave table (unused) or `DROP TABLE answer_retries` in a down note; the web with `retry_enabled=false` never sends attempt 2 |
| Retry behaviour | flag `platform.retry_enabled` (default false at deploy, true after QA) | flip the flag; legacy path untouched |
| Grade window and `style` filter | flag `platform.grade_window` (default false until the content gate) | flip the flag; the old picker code path stays until one release after |
| New worlds | seed run inserts 3 `draft` rows | set `status = retired` or delete rows; ids are unused in child settings |
| World status API | admin only | remove route; worlds stay as set |
| Questions rewrite | seed loader is idempotent and versions changed questions (`question_versions`); served copies in `questions` are immutable | re-run seed from the previous git revision: bank versions increment, children keep served copies; `retired` status for removed ids (loader already handles "removed from seed -> retired") |
| Subscription neutralisation | response mapping only | revert code; data untouched |
| `home_sections` | appconfig version N+1 | appconfig rollback is "another insert" (existing `Rollback`) |
| Contract | optional additions | old web builds ignore unknown fields; keep `correct_answer` required for old generated types by sending it for legacy calls |
| Deploy order | **API first** (additive, flags off), then web, then flip flags one at a time (retry, then grade window after content) | reverse: flip flags off, redeploy previous web, then previous API |

Pre-deploy: backup SQLite file (existing `deploy/vps` procedure), run `cmd/seed --validate-only`, run `go test ./... -race`. Rollout note and the rollback table go into the PR description and `docs/PROD_GO_LIVE.md` addendum.

## 7. Test strategy

**Unit and pure checks**

- Go: `contentdb` Rank and window (table tests), planner closest-year rule, prior function, retry handler (replay, other key, attempt 2 after correct, before first, mastery unchanged, rewards half credit, concurrent race with `-race`), hint window, world registry (inactive rejected in `StartSession`, settings, journey), subscription mapping per role, admin authz (parent token gets 403 on every new admin route), validators (table of bad and good scenes and media), curriculum matrix test, SC-003 distribution test, perf test of `pickCurated` (existing `perf_test.go`).
- Web: `scripts/check-scene-spec.mjs` (node type stripping like `check-scene-layout.mjs`): bind resolution, counts equal bound numbers (48 renders 48), grouping above cap, forbidden props, signature uniqueness over the exported resolved scenes of all published questions (the API provides `cmd/seed --export-resolved-scenes` JSON; web script reads a file path). Vitest for `story-machine` reducer (attempt, retry, lastReveal), `clock.ts`, `describe.ts`. Storybook interaction tests for every archetype (dark, high contrast, reduced motion, fr, en, TV), `check:stories`, `check:copy` (banned trial words), `no-cartoon-check` with the allowlist, `check-architecture`.
- Contract: `scripts/test.sh contract` (openapi vs frontend calls), regenerated types compile (`pnpm typecheck`).

**Playwright** (all in `scripts/`, run by `test.sh`, part of `all` and CI)

Viewport profiles (single source `scripts/lib/viewports.mjs`; each has `name, width, height, dpr, touch, orientation`):

| Group | Profiles |
|---|---|
| phone portrait | 320x568, 360x640, 360x740, 375x667, 390x844, 412x915, 428x926 |
| phone landscape | 568x320, 667x375, 740x360, 844x390, 915x412 |
| tablet | 768x1024, 1024x768, 820x1180, 1180x820 |
| desktop | 1280x720, 1366x768, 1440x900, 1920x1080 |
| TV | 1920x1080 dpr 1, 3840x2160 dpr 1 |
| screen-share and odd | 600x400, 800x450, 480x270, 1024x400, 400x800, 1280x300, 300x700 |
| zoom | 640x360 and 1280x720 at 200 percent (emulate by halving the CSS viewport and `Emulation.setPageScaleFactor` where available), 320x568 at 400 percent equivalent |

Scenarios per profile (`play-layout.mjs`): start a chapter in each of the three worlds; for question kinds `choice`, `numeric` (keypad), `truefalse`, `order`, `match`, `estimate`; assert: no horizontal scroll (`scrollWidth <= clientWidth + 1`); `[data-question]` fully inside the viewport (or inside its scroll container fully visible after at most one scroll gesture and a visible scroll hint); choices reachable; stage min height; tap targets at least 44 px; bubble count at most 1; text position stability (question bounding box moves at most 1 px between t = 600 ms and t = 2 s, and across keypad presses); layout shift (PerformanceObserver `layout-shift`, cumulative at most 0.02 during the question phase); after answer the sheet does not cover the question (or the question stays reachable); retry flow and previous-reveal flow; **resize mid-question** (1280x720 -> 600x400 -> 360x740 -> 1024x400 and back) with the same assertions after each resize; software keyboard simulation for `EstimateInput` by shrinking the visual viewport by 40 percent; offline toggle mid-chapter; reduced-motion run; fr-CA and en-CA text length extremes (long French strings from the seed's longest story).

`play-scenes.mjs`: per question render evidence (2.5), frame sampling at 4x CPU, node count, layers, bytes, leak test (30 scenes, heap growth), reduced-motion still equality of DOM counts, axe on the stage. `nav-audit.mjs` extended for world to journey to chapter to reveal to continue, inactive worlds absent, no dead end (error screen has a way back that works).

Existing scripts re-run unmodified as regression: `test.sh all`, `mobile`, `nav`, `play`, `feed`.

**API and system**: `go test ./... -race -count=1`, `go run ./cmd/seed --validate-only --exclude _examples`, `govulncheck`, `scripts/secret-scan.sh`, `pnpm audit --prod --audit-level=high`, `cmd/loadtest` before and after, `qa/` harness `./test.sh core` plus `qa` (repair stale `admin-propagation` first), prod-like local run (production build of web with `NEXT_OUTPUT=standalone`, API binary built as in CI, fresh DB, seeded, flags in final state).

**Security tests** (explicit): role matrix for every new route, parent cannot read other families' children, retry hint answer-leak scan across all questions, scene JSON injection (unknown archetype, huge counts, negative numbers, script-like strings in `alt`) rejected, inactive world bypass attempts by direct API call, subscription fields scan of every parent-visible response for banned values.

**Animation review**: protocol in 2.5, one record per question; gate per world (all four grades together, owner decision 10).

## 8. Phases, order of work and QA gates

```
Phase 0  decisions + baselines + repro + research + asset sourcing start
  Gate QA-0  every repro test fails for the documented reason; baseline recorded; D1..D7 answered
Phase 1  API foundation (contract, engine, retry, worlds, config, subscription, validators)       ┐ can overlap after T011
Phase 2  Web foundation (layout, retry UI, scene-stage core, parent/admin UI, pilot scenes)        ┘
  Gate QA-1  API foundation: go test -race, seed validate, authz tests, perf compare, flags off = identical behaviour
  Gate QA-2  pilot: 3 scenes (one per world) pass authoring, validation, render, perf, a11y, expert review, publish
Phase 3  content: espace (g1..g4), medecine (g1..g4), echecs (g1..g4); each batch = author, scenes, review
  Gate QA-3.w  per world w: 4 grades together: validators at error level, review records 100 percent approved,
               quotas met, matrix test, layout and scene suites green for that world, no exhaustion in chapter simulation
Phase 4  integration: all-world matrix, SC-003 on real bank, flags on (grade window, retry), security + perf gates,
         prod-like local run, independent QA sign-off (QA_SIGNOFF.md in both repos), owner review, PR prep
  Gate QA-4  release candidate: CI green in both repos, no open vulnerability, sign-off documents, rollout note, owner OK
```

Order rules: contract before code (CLAUDE.md 6); validators before content; scene-stage core before archetypes; archetypes and assets before scene specs; scene specs before review; grade window flag only after QA-3 for all three worlds; no PR opened before QA-4.

QA gates in detail:

| Gate | Checks | Owner of the check |
|---|---|---|
| QA-0 | repro tests red for the right reason; baseline file | layout QA, API dev |
| QA-1 | Go unit and race tests, seed validate (warn level), authz matrix, loadtest delta within 5 percent p95 and memory, flags off equals baseline behaviour (golden beat payload diff) | independent QA agent |
| QA-2 | pilot evidence set, frame sampling, a11y, review approved, budget script, 30-scene leak test | animation expert + layout QA |
| QA-3.w | all validators at error level for world w, 100 percent approved reviews, matrix and quotas, play-layout and play-scenes for w, chapter simulation without repeats | animation expert + independent QA |
| QA-4 | full `test.sh all`, `qa` core and qa suites, viewport matrix on three worlds, security tests, govulncheck, audit, prod-like run, sign-off docs | independent QA agent, then owner |

## 9. Risks and mitigations (plan level)

| Risk | Mitigation |
|---|---|
| Asset supply and licence delay | T008 first; backdrops can reuse the 6 existing photos per world only for the pilot; D7 budget approval; content tasks blocked by asset tasks, not the reverse |
| Archetype count explosion | cap 10 archetypes per world per grade band (about 60 total) with parametric variation (layout, count, camera, light, hook) producing the signature variety; archetype count tracked in tasks |
| Strict window hides chapters | flag, content gate QA-3, `PlayableFor` counts window candidates, admin coverage page shows per (world, grade, quest) counts |
| Retry reveal withheld breaks a legacy client | opt-in by `attempt: 1`; golden tests for legacy payload |
| Performance regressions | budgets as CI checks, lite tier, frame sampling in review evidence |
| Parent surprised by end of access | SA-10 neutral "access until" line and renew prompt after end |
| Two contract copies drift | `test.sh contract` in CI, tasks edit both in one task |

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| New `scene-stage` subsystem (core, registry, about 60 archetypes) while product rules say "reuse components aggressively" | Constitution IV and owner decision 1 require a unique scene per question; existing `ScenePicture` and `ConsequenceScene` are generic by design (family x rig) | extending `ConsequenceScene` families would still be shared scenes; the owner explicitly rejected generic reuse. The core reuses `MediaImage`, `useReducedMotion`, `useTilt`, `preloadMedia`, tokens and the sheet; archetypes share a rig |
| Two storage places for review (specs table and question JSON) | Publish gate must run server side and in admin; human table is the audit trail | file-only record cannot block publish; JSON-only record is unreadable for a reviewer comparing neighbours |
| Separate `answer_retries` table | keeps `beats_answered` and chapter counts exact; no change to `UNIQUE(beat_id, idempotency_key)` semantics for legacy | a second `answers` row would advance the chapter and need counting rewrites in several queries |
