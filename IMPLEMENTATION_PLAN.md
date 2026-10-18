# Numerix frontend implementation plan

Status: draft 1, 2026-10-12.
Specification: `docs/specs/frontend-spec.md` (section numbers below refer to it).
Guiding document: `docs/CLAUDE_CODE_PRODUCT_PROMPT.md`. Re-read it at the start of every phase.
API contract: `contracts/openapi.yaml`.

Shell commands in this plan are written with the project's token-saving prefix (`rtk`). Conversation replies stay terse; this file stays plain prose.

---

## 1. Working agreement

The product prompt requires this loop for every phase:

1. Review the docs and the spec sections for the phase.
2. Create the todo list for the phase.
3. Run the entry gate (section 3). Any "no" stops the phase.
4. Implement.
5. Review the implementation against the spec.
6. Test.
7. Collect evidence for the exit gate and record it in `PHASE_LOG.md` (created in P0).
8. Move on only when every exit item is checked.

Rules that hold in every phase:
- Storybook first. A component is built, documented and tested in Storybook before any screen uses it.
- No silent failures. Every error path has a visible state and a test.
- No hardcoded user-facing strings and no em dashes.
- Theme, i18n, responsive and motion safety are part of every component, not a later pass.
- The UI never computes or infers a math result. No pre-answer payload ever holds the answer.

---

## 2. Stack and decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 15, App Router, React 19, TypeScript strict | Required by the project; server components for static parts; Vercel native |
| Package manager | pnpm | Fast, strict, good lockfile |
| Styling | Tailwind CSS v4 with CSS variable tokens | Product prompt default; token system for 3 themes |
| Components | shadcn/ui (Radix) generated into `src/ui` and restyled | Product prompt default; Storybook-first friendly |
| Storybook | Storybook 8 with `@storybook/nextjs`, a11y, interactions, viewport, themes, test-runner | Canonical source of components |
| Motion | CSS first (transforms, keyframes, `@starting-style`), Motion `useAnimate` mini (2.3 KB) for sequences, `canvas-confetti` lazy loaded. `LazyMotion` + `domAnimation` (about 20 KB) only if a measured need appears. | Researched (spec 11.1): lightest practical, reduced-motion aware. Locked by the P0 size spike and an ADR |
| Render performance | React Compiler (evaluate in P0 spike) plus `memo` on list items | Product prompt: minimize re-renders, memoization |
| Agent skills | Vercel skills: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `building-components`, `next-best-practices`; `claude-code-templates` react-best-practices | Product prompt requires them in setup and planning (spec 19.5) |
| Bundle budgets | `size-limit` | Enforce spec 19.1 budgets in CI |
| Sound | Own `AudioManager` on Web Audio behind an `AudioPlayer` interface | No dependency, full control, easy to mock |
| i18n | next-intl, ICU messages, locales `fr-CA` and `en-CA` | Server and client components, plurals |
| Data | `openapi-typescript`, `openapi-fetch`, TanStack Query v5 | Contract-first, typed |
| UI state | Zustand (small slices) | Minimal re-renders |
| Forms and validation | React Hook Form with zod | One schema for forms and tests |
| PWA | Serwist | Maintained successor to next-pwa |
| Onboarding | driver.js wrapped as `GuidedTour` | Small, accessible, tokenized |
| Virtual lists | `@tanstack/react-virtual` | Feed-like lists |
| Unit and component tests | Vitest and Testing Library | Fast |
| End to end | Playwright and `@axe-core/playwright` | Cross-browser, a11y |
| Perf and PWA | Lighthouse CI | Budgets and installability |
| Deploy | Vercel | Product prompt |

Pin exact versions through the lockfile. Every dependency is justified in `docs/DEPENDENCIES.md` (created in P0) in one line each, and anything not in the table above needs a written reason before it is added.

### 2.1 Folder structure

```
Services/frontend/
  IMPLEMENTATION_PLAN.md
  PHASE_LOG.md                 evidence per phase
  package.json  pnpm-lock.yaml  next.config.ts  tsconfig.json
  .storybook/                  main, preview (theme, locale, viewport presets, typed fixtures)
  messages/                    fr-CA.json  en-CA.json

  public/
    sounds/                    packaged audio + LICENSES.md
    icons/  manifest.webmanifest
  scripts/
    check-stories.mjs          every component folder has a story; no component file outside a folder
    check-copy.mjs             no em dash, no stock AI phrasing
    check-sounds.mjs           files exist, listed in LICENSES.md, size budget
    check-contract.mjs         regenerate types, fail on diff
  src/
    app/                       routes, layouts, route handlers (auth/proxy)
    features/                  auth, children, play, home, collection, parent, onboarding
    game/<component>/          domain widgets; one folder each: index.ts, component, stories, test (spec 8.1)
    ui/<component>/            primitives; same folder shape; no barrel file (import @/ui/button)
    lib/
      api/                     typed client, query keys, problem+json parser
      audio/                   AudioManager, sound map
      errors/                  reportError, error map, ErrorBoundary
      i18n/                    config, formatters
      motion/                  MotionProvider, presets, reduced motion hook
      theme/                   theme provider, tokens
      session/                 story state machine (reducer), idempotency keys
    styles/                    tokens.css, themes.css
```

---

## 3. Gates

### 3.1 Entry gate (run before each phase)

This is the product prompt's "Strict verification gate", copied in its seven parts. Answer yes or no, with evidence. If any answer is no, do not proceed.

1. Product intent check
   - Is the feature playful and professional at the same time?
   - Does it support the game-like goals without feeling cheap or childish?
2. Storybook compliance check
   - Does every interface element already exist in a Storybook component?
   - If not, is it being created as a reusable Storybook primitive first?
3. Error handling check
   - Does the flow show explicit error messaging with recovery instructions?
   - Is there any silent fallback state?
4. UX quality check
   - Is there clear progress feedback, milestone feedback, and strong completion motion?
   - Is the onboarding flow present and helpful?
   - Is the default locale set from the device language?
5. Audio and polish check
   - Are sound cues present for important events?
   - Are the sound assets local and packaged correctly?
6. Technical and design-system check
   - Are tokens, theming, responsiveness, and accessibility accounted for?
   - Is the solution aligned with Tailwind + shadcn/ui and Storybook-first patterns?
7. Final go/no-go check
   - If any answer is no, do not proceed. Proceed only when every rule is satisfied and explicitly verified.

Before each phase, also re-read `docs/CLAUDE_CODE_PRODUCT_PROMPT.md` and the docs listed in its "Always read first" section, and record that in `PHASE_LOG.md`.

### 3.2 Exit gate (the 12 hard-stop items)

Mapped to automated evidence in spec section 20. Each phase records which items it affects and their evidence. A phase cannot close with an unchecked item.

### 3.3 Definition of done for any component

- Story with default, all variants, loading, error, disabled where relevant.
- Dark, light and high contrast checked.
- fr-CA and en-CA checked.
- Reduced motion checked.
- Keyboard and focus checked; TV viewport for interactive game widgets.
- axe passes; interaction test passes.
- Listed in the inventory.

---

## 4. Phases

Effort is in focused working days for one developer and is an estimate to be refined after P0.

### P0. Setup and gates (3 days)

Goal: a running empty app with all enforcement in place, so later phases cannot drift.

Tasks:
- P0-1 Decide the repository home for `Services/frontend` and `contracts/` (spec section 21, question 1). Initialize git and the first commit plan accordingly.
- P0-2 Scaffold: `rtk pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`.
- P0-3 Required tooling (product prompt, "Required tooling and setup"), run in the scaffolded project:
  - `npx claude-code-templates@latest --skill development/react-best-practices` (the exact command the prompt specifies).
  - Vercel skills (from `vercel.com/docs/agent-resources/skills`): `npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices`, `--skill vercel-composition-patterns`, `--skill web-design-guidelines`; `npx skills add vercel/components.build --skill building-components`; `npx skills add vercel-labs/openreview --skill next-best-practices`.
  - These run third-party code. For each: read what files it wrote and where, commit it on its own, record the review in `PHASE_LOG.md`. Rules from these skills are applied to every later review (spec 19.5).
- P0-4 Initialize shadcn/ui (`rtk pnpm dlx shadcn@latest init`) with the token-based theme. Generate only the primitives needed in P1.
- P0-5 Initialize Storybook (`rtk pnpm dlx storybook@latest init`), add the addons, a theme switcher, a locale switcher, a reduced-motion toggle, and viewport presets for phone, tablet, desktop and TV.
- P0-6 Token skeleton: `tokens.css` and `themes.css` for light, dark, high contrast (spec 9).
- P0-7 Enforcement: write the four scripts, the ESLint rules (`no-restricted-imports` for Radix and shadcn internals, `no-literal-string`, empty-catch ban), pre-commit hook, and CI workflow that runs lint, typecheck, unit tests, story coverage, copy check, contract check, Storybook build and test-runner.
- P0-8 i18n skeleton: next-intl config, middleware for device language detection, empty message files, a test with `Accept-Language`.
- P0-9 Contract pipeline: `gen:api` script reading `../../contracts/openapi.yaml`.
- P0-10 PWA skeleton: manifest, Serwist config, offline fallback page.
- P0-11 Vercel project config and preview environment variables.
- P0-12 `PHASE_LOG.md` (with the evidence template in section 8), `docs/DEPENDENCIES.md`, and an `adr/` folder.
- P0-13 Animation spike (product prompt: "research and choose the best lightweight animation solution"): build the same reward sequence three ways (CSS only; CSS plus Motion `useAnimate` mini; `LazyMotion` plus `domAnimation`), measure bundle impact with `size-limit`, frame rate on a mid-range Android profile, reduced-motion behavior, and hover/touch/large-screen behavior. Write `adr/0001-animation.md` with the numbers. Default outcome is CSS plus mini.
- P0-14 Sound sourcing: pick the packs (candidates: Kenney.nl CC0 audio, CC0 Freesound), verify each license at download, fill `public/sounds/LICENSES.md`, produce WebM/Opus and MP3 files within budget. Resolves spec 21 question 3.
- P0-15 Art and brand direction: a "Foundations" Storybook page with color, type, spacing, elevation, motion and sound, and the visual direction of spec 9.3 applied to one world as a proof. Resolves spec 21 question 2 enough to proceed (placeholders tracked as debt).
- P0-16 React Compiler evaluation: enable on a branch, compare re-render counts on the story screen, decide in an ADR.
- P0-17 `pnpm new:component <layer> <name>` generator (folder, component, story with theme/locale/state variants, test, inventory entry) so structure and Storybook coverage are produced, not remembered.

Exit evidence:
- CI is green on an empty app.
- Intentionally breaking each rule (unstoried component, em dash, raw Radix import, hardcoded string, empty catch) fails CI. Record the five failures.
- Storybook starts with the theme, locale and viewport controls working.
- Lighthouse shows the app installable.

Verification items touched: 1, 2, 4, 7, 9, 11.

### P1. Design system and shared toolkit (8 days)

Goal: every primitive and game widget the MVP screens need, with the providers around them.

Order (each is built in Storybook first):
1. Providers: `ThemeProvider`, `I18nProvider`, `MotionProvider`, `AudioProvider`, `ErrorProvider`, `QueryProvider`.
2. Primitives: Button, IconButton, Icon, Card, Dialog, Sheet, Toast and toaster, Banner, InlineError, FormField, Input, PinInput, Select, Switch, Avatar, Tabs, Tooltip, Skeleton, Progress (parent area).
3. Motion toolkit: `Reveal`, `Pop`, `PageTransition`, `Pulse`, `MotionPresence`, confetti helper, reduced-motion behavior.
4. Sound: `AudioManager`, `useSound`, the event map, download and package the sound assets, write `LICENSES.md` (spec 12).
5. Error system: problem+json parser, error map for every `code` in spec 14.2, `reportError`, `ErrorBoundary`, offline banner.
6. Game widgets: ChoiceButton, StoryPanel, NarrationText (streaming, fallback, pending), IllustrationFrame, OutcomeBeat (three beats), MascotBubble, WorldTile, JourneyNode, JourneyPath, StreakBadge, DailyGoalRing, StoryCard, RewardBurst, ChapterComplete.
7. Onboarding: `GuidedTour`.
8. Feed: `VirtualFeed` (cursor loading, sticky group headers) and `SnapFeed` (scroll-snap, keyboard and remote navigation, reduced-motion variant). Both are generic and reused by home, collection and the parent timeline.
9. Shared state: `createSlice` factory over Zustand and the generic hooks (`useFeed`, `useApiError`, `useSound`, `useReducedMotion`, `useLocaleFormat`).
10. Remaining primitives named in spec 8.1: `Panel`, `NotificationCenter`, `WorldTeaser`, `ContinueCard`, `QuestCard`.
11.
12. Inventory docs page in Storybook.

Exit evidence:
- Story coverage script lists 100 percent.
- Storybook test-runner with axe passes across themes and locales.
- Inventory page matches the screen specs (section 7).
- Reduced-motion and keyboard checks recorded.
- Sound size budget and `LICENSES.md` checks pass.
- Em-dash and literal-string checks pass.

Verification items touched: 1, 2, 3, 4, 6, 8, 9, 11.

### P2.



Tasks:
- P2-1 Generate types; typed `openapi-fetch` client; same-origin proxy route handlers with httpOnly cookies for parent and child sessions.
- P2-2 Query keys and hooks per feature (`useChildren`, `useJourney`, `useSession`, `useEngagement`, and so on). Mutations for `startSession`, `nextBeat`, `answerBeat` use idempotency keys.
- P2-3 SSE client for narration with a single reconnect, `fallback` handling, and a timeout message (spec 7.5).
the chosen answer selects the outcome (`correct`, `erreur_typique`, `erreur_aleatoire`) by request-body matching; rewards (card, streak, mastery, goal) come from scenario state; pause and resume; SSE narration served as `text/event-stream` with chunked delays.
- P2-5 Story state machine (`lib/session`): pure reducer with unit tests covering every state and transition in spec 7.5, including network drop and retry.

Storybook and Vitest use the shared typed fixtures. A script checks that every operation in `openapi.yaml` has a mapping and every mapping validates against the schema.


Exit evidence:
- Contract check passes. Every operation has a handler or a documented reason.
- State machine tests cover all transitions.
- Failure injection proves each error `code` produces its visible state.
- Engine boundary test passes.

Verification items touched: 3, 4, 10.

### P3. Parent area (6 days)

Stories: P-01 to P-12, X-01, X-02.

Tasks:
- P3-1 Register, login, session refresh, parent gate.
- P3-2 Setup wizard (add child, consent, worlds and goal) with onboarding.
- P3-3 Children list, child overview with timeline feed, settings, consent, account (language, export, delete with typed confirmation).
- P3-4 Session recap and weekly report; stuck-points component.
- P3-5 Child profile switch with PIN.
- P3-6 Playwright flow: signup, add child, consent, settings, recap.

Exit evidence:
- Playwright flow passes in Chromium, Firefox and WebKit.
- Every error path tested with failure injection.
- Language switch and device-language default tested.
- axe passes on every route.

Verification items touched: 3, 5, 7, 9, 11.

### P4. Child core loop (10 days)

Stories: C-01 to C-07, C-12, X-05.

Tasks:
- P4-1 Profile picker and PIN pad.
- P4-2 Home feed (spec 7.3b) as the landing after the profile picker, then world picker and transition to the journey. Uses the aggregate home request once CR-10 exists;
- P4-3 Journey map with all node states and the Play button.
- P4-4 Story screen on the state machine from P2-5: streaming narration, question, answering, outcome beats, rewards, pause dialog, resume after reload.
- P4-5 Chapter complete screen with card reveal, confetti and sounds.
the real flow uses a flagged first session from the backend, decision recorded).
- P4-7 TV mode: spatial navigation, large layout, remote key handling. Kiosk mode (spec 10.3): fullscreen layout, idle reset to the profile picker after pausing any open chapter, parent-password exit, optional attract mode.
- P4-8 Read-aloud with Web Speech API and the no-voice notice.
- P4-9 Playwright flow: pick child, pick world, play a chapter with all three outcomes, pause and resume, finish, see the card.

Exit evidence:
- Playwright flow passes, including offline and network-drop cases.
- Visual review of each outcome beat; none uses red or shake.
- Engine boundary test still passes against the screen's network calls.
- Performance budgets met on the story route.
- TV keyboard flow passes.
- Reviewed against `NUMERIX_CONTEXT.md` section 12 constraints (no score, progress bar, menu, timer, red X).

Verification items touched: all twelve.

### P5. Engagement (4 days)

Stories: C-08 to C-11.

Tasks:
- P5-1 Collection feed (virtualized, grouped, detail sheet).
- P5-2 Streak and daily goal on the home and the done screen.
- P5-3 Daily quest screen.
- P5-4 My growth screen.
- P5-5 Reward choreography polish (order, timing, reduced motion).

Exit evidence:
- Collection scroll stays at 60 fps with 500 cards in a profile test.
- Streak reset shows no loss screen (tested).
- Reduced-motion variant of every reward is recorded.

Verification items touched: 3, 6, 8, 11.

### P6. Cross-cutting audit (5 days)

Shift-left rule: the product prompt forbids postponing theme, responsiveness, PWA, Storybook, onboarding, sound or animation. So every earlier phase's exit gate already covers accessibility, performance, offline state, all three themes, both locales and the device matrix for what that phase built. P6 does not introduce these; it audits them across the whole app and fixes what the audit finds.

Tasks:
- P6-1 PWA: offline behavior table (spec 16) implemented and tested, update banner, install guidance.
- P6-2 Accessibility audit: manual screen reader pass (VoiceOver and NVDA), text scaling to 200 percent, high-contrast review.
- P6-3 Performance: budgets met on mid-range Android profile and low-end iPad; fix regressions.
- P6-4 Device matrix: iPhone SE size, large phone, iPad portrait and landscape, laptop, 1080p and 4K TV browsers.
- P6-5 Security review: CSP, cookie flags, proxy, no tokens in JS, dependency audit.
- P6-6 Copy review for tone and no AI-like phrasing in both locales.

Exit evidence: Lighthouse CI results, axe results, manual audit notes, device matrix screenshots, security checklist.

Verification items touched: all twelve.

### P7. Integration and playtest build (4 days)

Tasks:
- P7-1 Point the proxy at the real FastAPI;
- P7-2 Contract tests against the live backend; reconcile differences with the backend team and update `contracts/openapi.yaml` (change requests CR-1 to CR-8).
- P7-3 Seed the five playtest profiles; prepare the facilitator checklist.
- P7-4 Playtest build deployed; error reporting verified end to end.

Exit evidence: a full chapter played against the real engine with the real narrator, recorded; engine boundary test run against live responses.

Total estimate: about 50 working days for the full scope (P0 grew by 4 days for the animation spike, sound and art sourcing, and agent skills; P1 and P4 grew for the feed primitives, home feed and kiosk mode). The playtest cut (below) is about 32. These are estimates to refine after P0. The prompt forbids rushing for developer tempo, so a gate failure moves the date, never the gate.

### Playtest cut line

For the first five-children test, the minimum set is P0, P1, P2, P3 (register, login, child, consent, settings, recap), P4 and P7, with P5 (collection, daily quest, growth) and the full-app audit of P6 following. The cut drops screens, never foundations or gates: themes, i18n, sound, onboarding, error handling, Storybook, PWA basics, accessibility and performance checks all stay inside P0 to P4 and P7 because the product prompt forbids postponing them. Engagement basics needed for the test (streak, daily goal on the home feed) are pulled forward into P4.

---

## 5. Component inventory (to be kept live in Storybook)

| Component | Layer | Built in | Used by |
|---|---|---|---|
| Button, IconButton, Icon | ui | P1 | everywhere |
| Card | ui | P1 | parent lists, collection |
| Dialog, Sheet | ui | P1 | pause, confirm, detail |
| Toast, Banner, InlineError | ui | P1 | error system |
| FormField, Input, Select, Switch | ui | P1 | parent forms |
| PinInput | ui | P1 | profile picker, create child |
| Avatar | ui | P1 | profiles |
| Tabs, Tooltip, Skeleton, Progress | ui | P1 | parent area, states |
| ChoiceButton | game | P1 | story screen |
| StoryPanel, NarrationText, IllustrationFrame | game | P1 | story screen |
| OutcomeBeat | game | P1 | story screen |
| MascotBubble | game | P1 | onboarding, empty states |
| WorldTile | game | P1 | world picker |
| JourneyPath, JourneyNode | game | P1 | journey |
| StreakBadge, DailyGoalRing | game | P1 | home, done screen |
| StoryCard, RewardBurst, ChapterComplete | game | P1 | rewards, collection |
| GuidedTour | ui | P1 | onboarding |
| VirtualFeed, SnapFeed | ui | P1 | collection, parent timeline, home feed |
| Panel, NotificationCenter | ui | P1 | layouts, popups and toasts |
| Reveal, Pop, Pulse, PageTransition | ui (motion) | P1 | all screens |
| WorldTeaser, ContinueCard, QuestCard | game | P1 | home feed |

---

## 6. Sound and asset plan

- Pick a CC0 or equivalent sound source for the event map in spec 12. Record source, author, license and URL per file in `public/sounds/LICENSES.md`.
- Download once, normalize loudness, encode WebM/Opus and MP3, commit under size budget.
- Illustrations: world photos, mascot and avatars need an art source decision (spec 21, question 2). Placeholders (gradient and emoji-free simple shapes) are used until then and are tracked in the log as debt.

---

## 7. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Narration latency from the LLM | Child waits | Stream text, show the question separately after readiness, timeout message with retry, fallback text |
| Backend not ready | Frontend blocked | Contract-first; P7 swap |
| Contract drift | Rework | `check-contract` in CI, change requests tracked |
| Third-party template or install step | Supply-chain risk | Review output, commit separately, lockfile, dependency audit in CI |
| Autoplay and audio quirks on iOS | Silent or glitchy sound | Unlock on first gesture, visible notice on failure, real-device tests |
| SSE through a proxy | Buffering or drops | Test on Vercel preview early (end of P2), fallback to chunked fetch streaming if needed |
| TV browser variance | Layout or focus bugs | Spatial navigation tested with keyboard emulation, real-device check when available |
| Storybook-only rule slows early speed | Slower first weeks | Accepted by the product prompt; scripts keep it cheap |
| Child privacy requirements change the scope | Rework | Early privacy review (spec section 21), data minimization by design |
| "Addictive" interpreted as dark patterns | Harms the thesis | Spec 3.3 rules, reviewed in P4 and P5 exit gates |

---

## 8. Todo structure (mirrors the product prompt)

Tracked per phase in `PHASE_LOG.md` with these steps:

1. Review requirements
2. Inspect docs and current state
3. Define architecture and constraints
4. Plan implementation
5. Review the plan
6. Approve the plan
7. Implement
8. Review the implementation
9. Test the implementation
10. Iterate if needed
11. Continue only when checks pass

---

### Evidence template (one block per phase in `PHASE_LOG.md`)

```
Phase: Pn          Date:          Docs and product prompt re-read: yes/no
Entry gate: 7 areas, each yes/no with link
Todo list: the 11 steps, each with status
Exit gate: the 12 hard-stop items, each with evidence (command output, CI run, screenshot, test name)
Open debt: list (placeholders, deferred items with owner)
Decision: GO / NO-GO
```

---

## 9. Agent operating rules (token saving)

The product prompt makes token efficiency mandatory: compact high-signal planning, no repeated broad reads, reuse patterns, one deliberate decision applied consistently, no speculative over-engineering, no duplication. Practical rules for whoever builds this (human or agent):

1. Start each chat with the token-saver protocol; prefix shell commands with `rtk`; keep replies terse.
2. One read per file; act immediately; re-read only if the file changed. Use `PHASE_LOG.md` and the ADRs as external memory instead of re-reading the whole repo.
3. Re-read only the spec sections for the current phase plus the product prompt (short, mandatory), not the whole docs set.
4. Generate boilerplate with a script, not by hand: `pnpm new:component <layer> <name>` creates the folder, component, story (with theme, locale, state variants), test and inventory entry from templates (task P0-17). This also enforces the structure.
5. Batch work: after the design contract of a phase is fixed, hand a full spec to parallel workers (3 to 5) per batch of components, each producing complete files; no back-and-forth.
6. Compact the conversation at about 60 percent context; clear between unrelated phases.
7. Load only the tools a phase needs (browser automation only for visual and end-to-end verification).
8. Decide once. Decisions go to `adr/` and are not reopened without new evidence.
9. Prefer existing library behavior (Radix, Tailwind, next-intl, TanStack Query) to custom code.

---

## 10. Plan review record (product prompt: review the plan, then approve it)

The strict verification gate was run against this plan on 2026-10-12.

| Gate area | Result | Evidence or gap |
|---|---|---|
| 1 Product intent | Pass on paper | Spec 3.4 (healthy habit loop), 9.3 (visual direction), 11 (motion) |
| 2 Storybook compliance | Pass on paper | P1 builds all components first; folder-per-component and story-coverage script enforce it |
| 3 Error handling | Pass on paper | Spec 14 maps every `Problem.code`; failure injection in P2; fallback never silent |
| 4 UX quality | Pass on paper | Onboarding (spec 15), completion motion (11.4), device-language default (13) |
| 5 Audio and polish | OPEN | Sound sources not yet chosen or downloaded; licenses unverified (P0-14) |
| 6 Technical and design system | Pass with one pending decision | Tailwind plus shadcn, tokens, themes defined; animation library locked only after the P0 spike |
| 7 Final go/no-go | NO-GO | Open items below must close first |

Open items that block approval:
1. Repository home for `Services/frontend` and `contracts/` (spec 21, question 1).
2. Art source for world photos, mascot and avatars (question 2).
3. Sound source and license verification (question 3; resolved in P0-14).
4. The user's explicit approval of this revised plan.

Hard-stop rules 1 to 12 all have a defined evidence mechanism (spec section 20). None has evidence yet, which is correct before implementation starts.

### Revision log: what changed after re-reading the product prompt

The first version of this plan and spec under-used the prompt. Gaps found and fixed:
1. The strict verification gate was mapped but not run on the plan. Now run (section 10) and reported honestly as NO-GO.
2. The animation library was chosen without the research the prompt requires. Now compared with documented sizes (spec 11.1) and locked by a measured spike (P0-13).
3. The Vercel agent skills were treated as a later install. Now consulted in planning (spec 19.5) and their rules applied (no barrel files, no request waterfalls, composition patterns); install steps listed in P0-3.
4. A barrel-file design conflicted with the Vercel best practices. Replaced with one entry per component folder.
5. Feed-like scrolling was over-restricted. It is now a real part of the product: the home feed and shared feed primitives (spec 7.3b), with no user-generated content.
6. Kiosk and large display contexts were named but not designed. Added spec 10.3 and a P4 task.
7. The playtest cut deferred accessibility, PWA and performance work to a later phase, against the rule not to postpone them. Those checks now sit in every phase's exit gate; P6 is only an audit.
8. The spec lacked a concise summary and explicit goals. Added spec sections 0 and 1.1 and a traceability table to the prompt.
9. Hover, touch and large-screen transitions were not specified. Added spec 11.6.
10. Visual direction against "generic template design" was missing. Added spec 9.3.
11. SOLID was stated but not concrete. Added concrete rules and dependency-inversion interfaces (spec 8.3, P1).
12. Edge-safe architecture and environment management were thin. Added to spec 17 and 19.4.
13. The habit and mastery loop was undefined. Added spec 3.4.
14. Token-saving rules were absent from the plan. Added section 9 and a component generator (P0-17).

---

## 11. Decisions received and what is still needed

Received from the owner on 2026-10-12:
- Repository: `github.com/Perrin-Nj/numerix-web` (local folder `Services/frontend`). Vercel team slug `numerix`. Deploy to the free `*.vercel.app` domain for now.
- Revised plan treated as approved by the owner's go-ahead (the gate in section 10 is re-run at the end of P0 before P1 starts).
backend requirements are recorded there as work proceeds (spec 22.6).
- Mascot is pluggable by environment variables, emoji for now; free CC0 sounds downloaded by us; all components from Storybook; Material UI allowed where it matters under ADR; motion kits chosen by need (spec 22).
- Vercel configuration externalized and generated from the repo; config-first development (spec 22.1, 22.5).
- Agent skills: the Vercel skills from section 2 and these from the aitmpl catalog (`github.com/davila7/claude-code-templates`, `cli-tool/components/skills`): `web-development/react-best-practices`, `web-development/nextjs-app-router-patterns`, `web-development/progressive-web-app`, `web-development/shadcn`, `web-development/tailwind-design-system`, `web-development/tanstack-query-expert`, `web-development/zod-validation-expert`, `development/accessibility`, `development/e2e-testing-patterns`, `development/design-system-starter`, `creative-design/web-design-guidelines`, `creative-design/scroll-experience`. Installed in P0-3 through `npx claude-code-templates@latest --skill <category>/<name>`.

Still needed from the owner:
1. `gh auth login` (interactive) so pull requests can be opened from the CLI.
2. `npx vercel login` (interactive), then permission to create and link the `numerix-web` project in team `numerix`.
3. Local development and CI use Docker.
4. Preview protection: whether playtest families may open previews without a Vercel login (spec 22.5).

Start of work: P0-1 (repository, done), P0-2 (scaffold).

---

## 12. Status after the first implementation pass (2026-10-12)



Built and verified by running the app: parent register, login, child profiles, consent, settings, recap, weekly report, account; child profile picker with PIN, home feed, worlds, journey, the three-beat story chapter with streaming narration and all three outcomes, rewards, chapter complete, collection, daily quest, my growth; failure scenarios; PWA install and offline page; French and English; deployed to `https://numerix-web-blush.vercel.app`.


