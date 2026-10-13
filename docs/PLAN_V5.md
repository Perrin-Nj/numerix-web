# Plan V5: audit, phone polish, answer experience, human imagery, backend contract, clean architecture

Status: written, criticised and approved by the lead on 2026-10-13 (see "Approval"). Implementation follows in the order at the end.

## 1. Audit findings (measured, not guessed)

Phone audit (`scripts/mobile-audit.mjs`, 360x740, Zoé signed in), then security checks.

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| A1 | Worlds grid overflows sideways by 20 px | `/play/worlds` tile has fixed `w-48` in a 2-column grid | tile width `w-full`, `aspect-square`, min 0 |
| A2 | Parent header overflows by 129 px on phones | subscription pill + bell + theme toggle + sign-out do not wrap | pill becomes icon-only below `sm`, header can wrap, actions in an overflow menu below 400 px |
| A3 | Touch targets under 44 px on Me (Français/English 40 px, switches 32 px, 15 s 40 px) | audit | `Choice` buttons `min-h-11`, switch hit area padded to 44 px, `Button size="sm"` min height 44 on touch |
| A4 | Text under 14 px (demo banner 12 px, hints) | audit | demo banner 14 px and moved out of the bottom nav area, never over controls |
| A5 | Story page is 2072 px tall on a phone: picture, narration, mascot, hint and choices stacked | audit | story layout rebuilt for phones (section 3) |
| A6 | A floating mascot bubble overlaps content and the bottom nav on Home | screenshot | mascot bubble becomes part of the flow (header greeting), no fixed mascot |
| A7 | Gift overlay covers Home with no way to skip | screenshot | "Plus tard" secondary action, remembered for the session |
| A8 | Parent clicks Play on a child, then is asked again who plays | owner report | Play on a child card enters that child at once (PIN dialog only if the profile has a PIN), then `/play/home` |
| S1 | No `Origin` check on the same-origin proxy; relies on SameSite=Lax only | `route.ts` | reject mutating requests whose `Origin` is not the app origin (403 `forbidden_origin`) |
| S2 | `nx_parent_email` cookie is readable by scripts and holds PII | mock-only helper | only set when `useMock`; backend uses the token; document removal (BE side) |
| S3 | CSP allows `'unsafe-inline'` scripts | headers | document as a known limit; plan nonce-based CSP via proxy.ts (Next supports it) behind a flag, ticket BE-29 for report-uri |
| S4 | Admin login rate limit is per serverless instance | admin README | documented; Vercel Firewall rule recommended; real backend must rate limit |
| S5 | Dependencies | `pnpm audit --prod` | clean, add to CI list |
| S6 | Admin password in chat | session | rotate on first use, listed in handover |

## 2. Parent to Play (A8)

`ParentHome` and `ChildOverview` get a primary **Jouer / Play** button per child. It calls the existing child token flow (`useChildToken`), with the PIN dialog when `has_pin`, sets the local child profile (name, avatar), then routes to `/play/home`. The picker screen only shows when nobody is chosen. A "Changer de joueur" entry stays in Me. Test: parent clicks Play on Zoé, PIN 1234, lands on `/play/home` without the picker.

## 3. Answer experience redesign

Principles taken from research on feedback design: acknowledge within 100 ms, keep feedback next to where the child looks, let success linger two to three seconds, combine motion, sound and colour but never colour alone, make the recovery path obvious. Sources: animation feedback timing guidance (playbooks.com user-feedback-clarity), Material-Math issue on animated correct/incorrect feedback, the 2017 SMC study on correctness feedback in grade-2 maths apps (feedback style matters less than having it, so keep it short and clear).

Problems today: the outcome simulation is drawn **on top of** the scene picture (two images stacked), which is lazy and visually muddy.

New outcome flow ("stage + sheet"):
1. **Stage swap, not overlay.** The illustration area is one stage. Question phase shows the `ScenePicture`. On answer the stage cross-fades (scene lifts away, 250 ms) into the `OutcomeSim` full stage; nothing is drawn beneath it.
2. **Instant tactile reaction (under 100 ms).** The tapped choice animates first: correct = pop and glow with sparkles, wrong = soft wobble and dim, never red, never shake of the whole page. Optional `navigator.vibrate` (short for right, double for wrong) when allowed.
3. **Feedback sheet** slides up from the bottom (native-feeling bottom sheet, thumb reachable): human reaction character (happy or sad, section 4), one short line (spoken, text kept short), the **Continue** button large and fixed at the bottom. No wall of text, no second image.
4. **Staggered micro-animations**: stage content enters in 3 beats (sim, caption, sheet) at 0, 600, 1200 ms, skippable by tap; choices fade and compress away so the sheet owns the space; confetti only for right answers, soft dust for wrong ones.
5. **Streak of right answers inside a chapter** shows as growing glow on the hero, never a score or progress bar (product prompt rule).
6. Reduced motion: stage swaps by fade only, sheet appears without slide, sounds stay.

Phone layout of the story screen (360x740): a fixed top bar (exit, pause), a stage of about 38 % of the height, the narration in a scrollable-by-page region, and the four choices in a 2x2 grid pinned to the bottom with safe-area padding. Target: no page scroll to answer on a phone once the scene has been read.

## 4. More human imagery

- **Kid and hero avatars:** DiceBear **Open Peeps** (design CC0 1.0, code MIT) rendered locally with the `@dicebear/core` and `@dicebear/open-peeps` npm packages, deterministic from the avatar id or hero name. No network call, no tracking, no attribution required. Replaces the animal avatars and the emoji heroes of the stories. Licence confirmed from the DiceBear Open Peeps page. Other DiceBear styles vary per style (Adventurer is CC BY 4.0), so only CC0 styles are used.
- **Reactions:** Google **Noto animated emoji** (Lottie, WebP and GIF; third-party packages state CC BY 4.0, the repo licence must be re-checked before shipping). Self-hosted WebP for about 12 reactions (happy, sad, thinking, party, hug, thumbs up, star-struck, pleading, sleepy, wave, clap, hearts). Credit line in the About screen. Reduced motion shows the static emoji.
- **Mascot:** kept, but its poses move to the human-style reaction characters above for outcome feedback; the fox stays as the app's brand character in greetings only.
- **Scenes:** `ScenePicture` objects stay emoji but get human context (a Peeps character next to the objects in each world, doing the action).
- Licence ledger `public/LICENSES.md` lists every asset, author, licence, URL and date checked.

## 5. Backend contract, complete (`contracts/`)

Deliverables:
- `contracts/BACKEND_INTEGRATION.md`: the one document a backend team reads. Sections: architecture and trust boundaries, auth (parent login, refresh, child token, PIN, consent, cookies or bearer, token lifetimes), the full endpoint catalogue with who calls it and when, request and response examples, error catalogue (`Problem` codes with HTTP status, fr/en text keys, frontend behaviour), idempotency rules, pagination, narration SSE protocol (events, heartbeats, fallback, resume), subscription and payments (hosted checkout, webhooks, states, grace), notifications and web push (VAPID, payload, topics), admin API, platform config, analytics series, audit log, data model per entity with fields, enums and limits, rate limits, CORS and CSP, headers the frontend sends, health and readiness, versioning and deprecation, content rules (localisation, reading level, no free text from children), privacy (Law 25: retention, export, delete, consent), observability, performance budgets, environments and env vars, seed and fixtures, acceptance checklist, and a migration switch list (`USE_MOCK`, `STATE_SOURCE`).
- `scripts/api-inventory.mjs`: scans `src/**` for every API call and every `/api/v1` path, compares with `contracts/openapi.yaml` and with the guide, and fails when a call has no operation or an operation is undocumented. Part of `scripts/test.sh contract`.
- `contracts/BACKEND_REQUIREMENTS.md` is kept and cross-linked; every BE item has an owner, priority, and acceptance test.
- The list is reviewed three times: (1) inventory script output, (2) walk through each screen and note every network or stored value, (3) walk through `docs/PRODUCT_PROMPT.md` hard rules. Result recorded in the guide's "review log".

## 6. Clean architecture

Target layers (dependencies point inward only):

```
app/        routes, layouts, route handlers (thin)
features/   screens and flows (compose game and ui, call data)
game/       domain widgets (kid app components)
ui/         design system primitives (no app knowledge)
data/       gateways: ApiGateway (HTTP) and LocalGateway (event log) behind one interface, query hooks
domain/     pure rules, types, selectors, catalog (no React, no fetch, runs in node)
platform/   browser services: audio, speech, notifications, storage, theme
config/     validated environment
```

Changes: `lib/game/*` becomes `domain/game/*`; `lib/api` becomes `data/api`; `features/api/hooks.ts` (360 lines) is split into `data/hooks/{auth,children,sessions,progress,platform}.ts` with one gateway interface (`data/gateway.ts`) and two adapters, so switching `STATE_SOURCE` swaps an adapter, not scattered conditionals; `lib/{audio,speech,notify,theme,motion}` become `platform/*`. Barrel files per folder, each folder gets a `README.md` (purpose, public API, rules, examples). ESLint `no-restricted-imports` zones and `scripts/check-architecture.mjs` enforce the arrows in CI. `docs/ARCHITECTURE.md` explains layers, data flow (kid answer to state to screens), local vs api state, error handling, i18n, theming, testing. TSDoc on every exported function and component. ADRs for the gateway split and the layer rules.

Risk: a large move can break imports. Mitigation: do it last, mechanically (git mv plus path rewrite script), typecheck and the full shell suite after each layer move, commit per step.

## 7. Critique of this plan

1. Too much at once. Mitigation: five independent work packages with file ownership, each ends with green checks; the refactor is last so it does not collide.
2. Bundle size from DiceBear and animated WebP. Mitigation: import only the Open Peeps style, generate SVG at runtime and cache; self-host 12 WebPs under 60 KB each; check with the bundle budget script.
3. Noto animated emoji licence is not confirmed from the source. Mitigation: the implementing agent must fetch the repository licence and record it; if it is not CC BY 4.0 or compatible, fall back to OpenMoji (CC BY-SA 4.0) or static Noto (OFL) and say so.
4. A bottom sheet over the choices can hide the question the child wants to re-read. Mitigation: sheet height capped to 40 %, a "revoir la question" handle.
5. Vibration and sound can be unwelcome. Mitigation: both follow the existing sound toggle and a new "vibrations" preference, default on for sound and off for vibration.
6. Human-looking avatars raise representation concerns. Mitigation: Open Peeps offers varied skin tones, hair and accessories; avatar picker lets the child compose rather than assigning.
7. Backend list could still miss items. Mitigation: the inventory script is mechanical, plus the three review passes.
8. Measuring "playfulness" is subjective. Mitigation: scripted checks for timing (reaction under 100 ms, sheet by 1.2 s), reduced-motion variants, and a manual Storybook review checklist in the plan's exit criteria.

## 8. Approval

Reviewed on 2026-10-13: scope is coherent, the order avoids file collisions, risks have mitigations, and every item has a check. Approved to implement.

## 9. Order of work and ownership

| Step | Owner | Files | Exit check |
|------|-------|-------|-----------|
| 1 Phone fixes A1 to A4, A6, A7 and parent Play A8, security S1 S2 | lead | `ui/**` touch sizes, `ParentHome`, `ChildOverview`, `HomeFeed`, `WorldTile`, proxy | `scripts/mobile-audit.mjs` passes, ui checks pass |
| 2 Answer experience and story phone layout (section 3) plus human imagery (section 4) | agent story | `StoryScreen`, `game/{outcome-sim,scene-picture,mascot,choice-button,story-panel,outcome-beat,illustration-frame,human-avatar,reaction}`, `public/reactions`, `public/LICENSES.md` | story checks, mobile audit story step, reduced-motion stories |
| 3 Backend contract and inventory script | agent contract | `contracts/**`, `scripts/api-inventory.mjs` | `test.sh contract` passes |
| 4 Clean architecture refactor and docs | agent architecture | whole `src/` moves, eslint config, `docs/ARCHITECTURE.md`, folder READMEs | typecheck, lint, full suite, architecture check |
| 5 Redeploy app, mock, admin; update PR | lead | | live checks |
