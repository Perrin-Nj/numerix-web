# scene-stage

Illustrated 3D scenes for in-play questions in `echecs`, `medecine` and `espace`. One archetype (code, reviewed once, lazy loaded) plus one spec per question (data, bound to the question's own numbers). Owner art decision (spec 001, decision 17): layered CSS 3D lanes, HTML sprites holding small inline SVG art with gradients and soft shadows, and a reveal-only canvas 2D layer. No WebGL, no dependency added.

## Public API

```tsx
<SceneStage spec={SceneSpec} source={SceneSource} phase="question" | "ok" | "ko" fallback={<QuestionVisual/>} tier?="full"|"lite" />
```

- `phase="question"`: entrance, then idle loops. `ok` / `ko`: the reveal, using `source.correctAnswer` for reveal-only values.
- Anything that fails (chunk, binding, render) shows `fallback` and is reported (`reportError` in dev, `console.error` in production). Never an empty box.
- The play screen reaches it only through `src/features/play/sceneStageFor.tsx` (one function, called from `StoryScreen`). It returns `null` for a question with no `scene`, so every other world is untouched.
- `bind.ts` is the swappable binding layer. Today the source is a local fixture (`fixtures/pilot.ts`) or the beat payload; when the API serves `question.scene` (see `specs/001-three-worlds-premium/contract-delta.md`) only `sceneStageFor.tsx` changes.

## Files

| File | Role |
|---|---|
| `spec.ts` | `SceneSpec` v1 types and `validateSpec` (pure) |
| `bind.ts` | `resolveScene`: numbers from `text`, `calc`, `math_text`, `visual`, `answer` (reveal only); provenance rule; count cap 60 |
| `describe.ts` | accessible label from the spec's `alt` with resolved numbers |
| `clock.ts` | the one `requestAnimationFrame` loop, jank detection, tier detection, frame sampling (`window.__nxFrames`, only with `?perf=1` or Playwright) |
| `rig.css` | stage, art unit `--u`, lanes, camera, key lights, kit classes (sprite, shadow, gloss, motes, breathe, blink), lite tier, reduced motion |
| `Layer.tsx` | one depth lane (`z` in px, compensating scale) |
| `fx/Particles.ts` | reveal-only canvas: story-shaped burst (paper, bubble, star) and fireflies, at most 150 particles, asleep when empty |
| `moves.ts`, `kit/moves.css` | the hook, right and wrong move library (ids implemented once) |
| `kit/Sprite.tsx` | `Sprite`, `Shadow`, `Motes` building blocks |
| `kit/<world>.tsx/.css` | world kits: echecs (6 pawn looks, flag), medecine (puppy rig, drop, dropper, cloud), espace (clock face, hands, rocket, drone) |
| `registry.ts` | archetype id to lazy chunk, `ARCHETYPE_META`, `preloadScene` |
| `archetypes/*` | one `.tsx` and one `.css` per archetype |
| `validate.ts` | content gate used by `scripts/check-scene-spec.mjs` |

## Archetypes (pilot)

| id | world | what it draws | bound from the question |
|---|---|---|---|
| `echecs.board-row` | echecs | a long lacquered board row in a club room with a snow window; six distinct pawn characters on the question's cells; breathing free squares; flags or step-back plus a count at the reveal | `cols`, `covered` (visual cells), `free` (answer) |
| `medecine.dose-vial` | medecine | a clinic corner: puppy on an exam table watches the dropper beside a dose vial (marks every 5, drops from the bottom), thought cloud hook; the dropper visits each free column and the missing drops fall in, counted; wrong: a ghost tag with the typical wrong value fades | `total`, `given` (text), `left` (answer), `wrong` (derived add, reveal only) |
| `espace.control-clock` | espace | huge wall clock in mission control, window with rocket, steam and a supply drone; hands wind to ANY hh:mm | `hour`, `minute` (visual) |

## How to author a new scene (data only, when an archetype exists)

1. Copy a fixture in `fixtures/pilot.ts` (later: the `scene` field of the question JSON).
2. Pick `archetype`, `setting`, `subjects`, camera, light, hook, reveal ids.
3. Bind every number: `{ from: 'text', index }` (digits of story then prompt), `calc`, `math_text`, `visual` pointer, or `answer` with `reveal_only`. Never type a count. A literal count above 1 must appear in the question (`check-scene-spec` fails otherwise).
4. Write `alt` fr and en with `{name}` holes (every number in an alt must be a bound value). Describe the picture, never the answer; the answer goes in `alt.reveal`.
5. Run `pnpm check:scenes`, add a Storybook case if the archetype is new, then `pnpm scenes:evidence` and send the evidence to the review.

## How to add an archetype

1. `archetypes/<world>.<name>.tsx` (default export, `ArchetypeProps`) and a `.css` next to it. Use `Layer` for 3 to 4 depth lanes: far backdrop (blurred), mid set, the subject lane (z 0), optional foreground (`lite={false}`, never over counted props).
2. Register in `registry.ts` (loader and `ARCHETYPE_META`: burst point, burst delay, sky) and add the id to the API's `seed/scene/archetypes.json` (drift test).
3. Budgets: at most 250 DOM nodes (use one `<path>` for many shapes, `<use>` for repeated art), at most 8 layers, chunk at most 12 KB gzip (`pnpm check:scenes`). Unique SVG ids: never reuse a gradient id across the layers of one scene, and never put a shared `<defs>` in a layer that can be hidden.
4. Story per archetype (question, ok, ko) and one entry in `fixtures`.

## Motion rules (the animation principles every scene must show)

- The base style is the settled picture. Entrances use `backwards` fill; reveals key on `[data-phase]`. With reduced motion every animation is removed and the settled still carries every quantity.
- Only `transform` and `opacity` animate. No `filter` animation, no layout properties.
- Anticipation before action (crouch, lift, squeeze), ease in on a fall, ease out on a landing, overshoot and settle, squash and stretch on landings, stagger 60 to 160 ms between siblings, follow-through (ears, tail, antenna), idle life (breathing, blinking, drifting light, twinkling).
- Right answer: celebratory (hops, rings, sparkles after the story beat). Wrong answer: gentle and instructive (nod, head tilt, the correct situation shown with a glow and numbers). No shake, no red, no flash above 3 Hz (idle loops have a cycle of at least 0.8 s).
- Entrance at most 1.6 s, reveal at most about 2.5 s including the story beat.

## Tiers

`full`: all lanes, drift, canvas, pointer tilt. `lite` (4 cores or fewer, 2 GB or less, or jank in the first second): no canvas, no drift, no blur filter, no decorative foreground lane; every prop and count stays. `reduced motion`: still image, 150 ms fade, no replay button.

## Evidence and the animation REVIEW PROTOCOL

Generate evidence (Storybook running):

```
pnpm storybook                              # port 6006
node scripts/play-scenes.mjs --base http://localhost:6006 --out evidence --sizes phone,tablet,desktop,tv,short
```

Per scene it writes `evidence/<id>/frames/<size>-<phase>-t<ms>.png` (deterministic: animations are paused and seeked, so a frame is exactly t ms into the motion), `evidence.json` (label, DOM nodes, layers, frame time p50 and p95 at 4x CPU, reduced-motion check, flashing check, axe in 3 themes, keyboard replay) and `contact.html` (this scene beside the others for uniqueness, plus the frame strips for question, right and gentle miss).

An independent animation expert (never the author) reviews every question. One row per question in `specs/001-three-worlds-premium/review/<world>-g<grade>.md`:

| # | Criterion | Pass rule |
|---|---|---|
| 1 | Uniqueness | signature differs from every other question in the quest and world; the contact sheet shows a recognisably different composition, objects, camera, light and hook |
| 2 | Match to the question | every number, object and relation of story, prompt and math text is visible and correct; no prop contradicts the story or the world; counts equal the bound numbers |
| 3 | Attention hook | within 400 ms something purposeful draws the eye to the key quantity |
| 4 | Accessibility | `role="img"` label states the quantities; no information only by motion; replay by keyboard; reduced motion still carries everything; axe clean in light, dark, high contrast |
| 5 | Performance | at most 5 percent of frames above 20 ms at 4x CPU; at most 250 nodes, 8 layers; no flash above 3 Hz; lite tier keeps all counts |
| 6 | Motion quality | anticipation, easing (never linear), overshoot and settle, squash and stretch, staggered timing, follow-through, idle life; right reveal celebratory; wrong reveal gentle and instructive; entrance at most 1.6 s |
| 7 | Teaching | the reveal reinforces the explanation, not only the party; a wrong answer shows the correct situation without blame |
| 8 | Tone | no timer, hurry word, emoji; warm, premium illustration; no clip-art look |

Each row ends with a status: `approved` or `rejected` (plus `in_review` and `changes_requested` while open), the failed criteria and a one-line note. Any edit to a spec resets it to `in_review` (the `scene_hash` changes). `approved` records must equal published questions in the three worlds (SC-001).

## Checks

`pnpm check:scenes` (spec content gate and bundle budget), `node scripts/no-cartoon-check.mjs --self-test` (the scoped art allowlist: `src/game/scene-stage/` may hold drawn figurative art; emoji, DiceBear and Fluent packs stay banned there; every other folder keeps every ban), `pnpm exec vitest run --project unit`.

## Art system rules (from the pilot review, enforced in review)

1. **Art unit.** Everything is sized in `--u`: `min(--wf cqw, 100cqh / --hs)`. `--hs` is the subject height in units, so the subject can never overflow the stage, and `--wf` lets it fill the width. Wide stages spread sprite x offsets by `--sx` (1.25, 1.55, 1.8). The subject must fill at least 55 percent of the stage width on phone, tablet, desktop and TV (check the evidence frames at the five viewports).
2. **No filters.** No `filter`, no `backdrop-filter`, no blend modes. Depth is atmospheric (pale, low contrast far lanes), parallax lanes and moving light. Nothing inside a lane animates except small promoted boxes.
3. **Compositor only.** Animate `transform`, `translate`, `rotate`, `scale`, `opacity` on HTML boxes (`.nx-anim`). Never animate inside a stage-sized SVG, and keep breathing on a wrapper box, not on an SVG group (that repaints the svg every frame). Characters are built from separately promoted layers (see the puppy: tail, body, head with ears). At most 4 animated groups per object, at most 6 things moving at once during a reveal.
4. **Real light.** One lamp cycle (11 s) drives every `.nx-shadow` sway and every `.nx-gloss` glint, so light and shadow agree. Key lights are presets (`data-light`).
5. **Characters, not clones.** A counted object is a character with variation per index (look, accessory, expression, idle phase). Rigs have an eye line (`.nx-pupil` with `--lx`, `--ly`), blink, and moods keyed on the stage phase (idle, happy, thinking).
6. **Pointer parallax only.** The pointer slides the lanes by their `par` factor, never rotates the stage, and the subject lane stays put, so nothing clips at 360 px.
7. **Hook, right and wrong from the library.** The spec picks ids from `moves.ts`. Wrong moves are as visible as right ones (a head tilt, a step back of several units, a ghost number, a pulsing long hand), gentle, never red.
8. **Brief conformance.** Every spec carries `brief` keywords that must occur in its approved brief line (`scene-briefs/<world>.md`), and the numbers of the brief's scene line must be the numbers the spec binds: `pnpm check:scenes` (`scripts/check-scene-brief.mjs`). The review compares the render with the brief and records deviations.
9. **No hard-typed time or count.** The clock reads `hour` and `minute` from the visual for any hh:mm; the label describes the picture and never states the answer before the reveal; reveal text uses `{minute:pad2}`.
10. **Performance gate.** Under 5 percent of frames above 20 ms at 4x CPU, measured by `scripts/play-scenes.mjs` with its own frame meter, on a production Storybook build (`storybook build`, then serve the folder) as well as dev.

## Scaling to every question (router, kits, coverage)

- **Router** (`route.ts`): `routeQuestion(world, rawSeedQuestion)` picks the archetype from the question family and visual kind and builds the whole `SceneSpec` with every number bound (visual pointers or the text, spelled numbers 2 to 12 count). A question no rule fits comes back as `{ skip: reason }`, never with a wrong scene. Until the API serves `question.scene` this is the authoring path for the generic archetypes; hand-written specs (`fixtures/`) stay for archetypes with a brief of their own.
- **Archetypes** (about 60 budget, 11 so far): `control-clock` and `clinic-clock` (any hh:mm; views `approach`, `docked`, `pad`, `clinic`), `grid-board` / `mat-grid` / `star-grid` (one `board.tsx`, three skins), `piece-bars` / `shelf-chart` / `star-chart` (one `chart.tsx`: bars and pictographs), `sky-count` (text-only space stories), plus the pilots `board-row`, `dose-vial`.
- **Kits**: `kit/glyphs.tsx` (30 counted-object glyphs, tinted per index, so counts are characters not clones), `kit/worlds.tsx` (skin and backdrop per world, draws the room objects a question names: trophy, clock, scale, vial, station...), `kit/echecs`, `kit/medecine`, `kit/espace`, `kit/moves.css` (hook, right and wrong move library).
- **story-objects rule** (`objects.ts`, `validate.ts`): the objects a question's text names (pawn, station, rocket, clock, dog...) must be listed in `spec.requires` and be in the archetype's `can` list (`ARCHETYPE_META.can`), otherwise `check-scene-spec` fails and the question counts as uncovered. Add a word to `objects.ts` when a story names a new thing, then draw it in a kit.
- **Coverage** (`coverage.test.ts`, run by `pnpm check:scenes`): routes the 343 seed questions (`SEED_ROOT` or `../numerix-api/seed/questions`), runs the gate on each, prints covered/uncovered per world and per archetype; `COVERAGE_OUT=file.json` writes every reason.
