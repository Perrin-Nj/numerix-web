# Numerix frontend specification

Status: draft 1, 2026-10-12. Owner: product and engineering.
Guiding document: `docs/CLAUDE_CODE_PRODUCT_PROMPT.md` (the "product prompt"). Every section below traces back to it, to the project docs, or to the API contract.

Companion files:
- `Services/frontend/IMPLEMENTATION_PLAN.md`: how and when this gets built.
- `contracts/openapi.yaml`: the API the frontend consumes.

---

## 0. Summary and traceability

**What:** a Next.js PWA where children aged 6 to 11 play math through stories, and parents follow progress. It must feel like a game and like a premium educational product at the same time, on phone, tablet, desktop, TV and kiosk, in light, dark and high-contrast themes, in fr-CA and en-CA (device language first).

**The rules that shape everything:**
1. The math engine decides; the UI and the LLM never compute or reveal an answer early.
2. Storybook is the only source of UI components. Nothing ships in the app that is not in Storybook first.
3. No silent errors. Every failure is visible with a recovery step.
4. Motion, sound and onboarding are product features from day one, not polish.
5. Themes, i18n, PWA and responsiveness exist from the first commit.
6. No AI-sounding copy and no em dashes in the product.
7. Play screen stays the docs' "one story, one question" screen; Duolingo-like structure lives outside it.

**Traceability to `docs/CLAUDE_CODE_PRODUCT_PROMPT.md` (the guiding motor):**

| Product prompt section | Where it is satisfied |
|---|---|
| Mission, platforms, themes | 0, 4, 9, 10 |
| Always read first | 2 (sources), plan section 1 |
| UX guardrails 1 to 9 | 14 (errors), 8.2 (Storybook), 11 (motion), 15 (onboarding), 12 (sound), 13 (language), 7.3b and 7.7 (feed), 13 (copy rules) |
| Core rules 1 to 10 | 8 (reuse, SOLID, composition), 13 (i18n), 9 (themes), 16 (PWA), 10 (cross-platform), 11 (animation), 19 (performance) |
| Preferred UI stack | 8, plan section 2 |
| Required tooling and setup (Vercel skills, react-best-practices) | 19.5, plan P0 |
| Animation library requirements | 11.1 (researched comparison) |
| Storybook and reuse rules | 8.2, 8.4 |
| Product personality, avoid list | 3.4, 9.3 |
| Planning workflow, spec-first | this document, plan sections 1 and 8 |
| Hard stop rules, strict verification gate | 20, plan section 3 and plan review record |
| Token-saving rules | plan section 9 |
| Default implementation expectations | plan P0 and P1 exit gates |
| Quality bar, final instruction | 20, plan section 3.3 |

---

## 1. Purpose and scope

Numerix teaches math to children aged 6 to 11 through stories. The child picks a world they love. The math they do decides what happens to the hero. A wrong answer changes the plot, not a grade.

This spec defines the Next.js web application that children and parents use. It covers screens, behavior, components, design tokens, motion, sound, localization, error handling, offline behavior, data access, privacy, performance, accessibility, tests and deployment.

In scope:
- Parent area: account, consent, child profiles, settings, reports, data export and deletion.
- Child area: profile choice, world choice, journey map, story chapters, rewards, collection, daily quest, own growth.
- Design system and Storybook library.
- PWA, themes, localization (fr-CA and en-CA), sound, onboarding.

Out of scope for this version:
- The backend, the deterministic engine and the narrative prompts (separate work).
- Grade 5 and 6 curriculum (cycle 3 data does not exist yet).
- Child-to-child content of any kind (chat, sharing, public feeds, leaderboards).
- Native apps. The product is a PWA.
- VR. The layout system must not block it, nothing more.

### 1.1 Goals and success measures

| Goal | Measure (proposed targets, confirm in the first playtest) |
|---|---|
| Children return because the story pulls them back | Share of playtest children who start a chapter on 3 or more days in the first 2 weeks; chapters finished per active week |
| Parents trust the product | Consent completion rate; zero unexplained errors in the playtest log; parents can name where their child is stuck |
| Skills stick | Review retention from engine data (skills still mastered after their review date) |
| Premium quality | Performance, accessibility and verification-gate results (section 19, 20) |

These are healthy-engagement measures. Time spent is not a goal.

---

## 2. Source of truth and precedence

1. Project docs in `docs/` define product intent and technical boundaries.
2. The product prompt (`docs/CLAUDE_CODE_PRODUCT_PROMPT.md`) is the guiding motor: it defines how the frontend is planned, built and verified. It is re-read at the start of every phase.
3. This spec turns both into testable requirements.
4. When two sources conflict, section 3.3 records the resolution. Unresolved conflicts go to section 21.

---

## 3. Principles and guardrails

### 3.1 From the docs (non negotiable)

- **The model never does math.** The engine builds the problem and rules on the answer. The UI never computes, checks or infers a result.
- **No answer before the child answers.** The correct answer appears only in the response to an answer. No screen, cache, log, analytics event or prefetch may hold it earlier.
- **Three outcomes.** `correct`, `erreur_typique`, `erreur_aleatoire`. The outcome selects a story beat. It is never rendered as success or failure chrome.
- **On the play screen:** one story, one question, nothing else. No score, no progress bar, no menu, no timer, no red X, no leaderboard.
- **Competition is only against the child's own past.**

### 3.2 From the product prompt (non negotiable)

1. No silent errors. Every failure is visible with a way to recover.
2. Storybook-only components. Nothing is used in the app unless it exists in Storybook first.
3. Strong event-driven motion for wins, milestones and transitions.
4. Game-style onboarding for first-time users.
5. Sound feedback with locally packaged assets.
6. Default language is the device language.
7. High-impact, clear animation quality, lightweight.
8. Feed-like scrolling patterns are designed in from the start.
9. No AI-style wording and no em dashes in product text.
10. Playful and professional at the same time.
11. Reuse and composition over duplication, SOLID.
12. i18n, themes (light, dark, high contrast), PWA and cross-device adaptation from day one.
13. Tailwind CSS plus shadcn/ui as the UI foundation.
14. Vercel-first deployment assumptions.
15. Strict verification gate before every phase (section 20).

### 3.3 Conflicts and how they are resolved

| Product prompt says | Docs say | Resolution |
|---|---|---|
| "Addictive", "habit-forming" | Math must not be a toll gate. No coins or extrinsic reward. | Healthy habit loop only. Story-day streak with no guilt screen on loss, daily goal set by the parent, parent time limit, no hearts, no XP, no variable-reward slot mechanics, no urgency timers. Return value comes from the story and visible growth. |
| Social-feed style scrolling is part of the product direction | Child data is sensitive. No leaderboards. | The feed pattern is built now and used for real: the child home feed (continue, daily quest, world teasers, recent cards), the collection, and the parent timeline. All feed content is curated by Numerix or is the child's own. There is no user-generated or child-to-child content. A future social feed needs its own privacy review. |
| Win and error animations | No red X. A wrong answer is a new plot point. | Outcome animations are story beats with the same visual weight. Error visuals (red, shake, buzzer) are reserved for system errors such as a network failure. |
| No silent fallbacks | When the LLM fails, canned text is shown. | The fallback is allowed because it keeps the child playing, but it is never silent: a calm non-blocking notice appears, and the parent recap marks the beat as told in fallback mode. |
| Offline support | Grading happens on the server engine. | Offline mode lets the child browse the journey and the collection. Answering needs a connection. This is stated explicitly on screen with a retry. |
| Sound for key events | Calm, focused play screen. | Sounds are soft, on by default, togglable by the parent and in play. No sound on a wrong answer. |
| No menu on the play screen | Accessibility and safety need a way out. | One quiet "Pause" icon button stays in a corner. It is the only chrome. It is a deliberate, minimal exception. |

### 3.4 Habit and mastery loop

The prompt wants the product motivating, rewarding, habit-forming and "addictive in a healthy, positive way": satisfying progression, clear feedback, delight, mastery loops and strong emotional payoff. The design that satisfies it without breaking the docs:

1. **Loop.** Pick a chapter, play a story where math decides the plot, see the consequence, earn a story card, see the path grow, come back for the next chapter or today's review quest.
2. **Mastery.** Journey nodes gain a shine ring as a skill is kept over time (spaced reviews), so returning to old skills is itself rewarding.
3. **Anticipation, not pressure.** The home feed always offers one clear "what's next" card. Cliffhanger endings are allowed in stories; countdowns, urgency banners and loss messages are not.
4. **Emotional payoff.** Chapter complete is a real moment (card reveal, sound, brief confetti). Mastering a skill is a visible power-up in the story world.
5. **Healthy limits.** Parent-set daily goal and time limit; at the limit the child sees a warm "see you tomorrow", never a block screen of shame.
6. **Parent loop (optional).** Parent-controlled reminders (web push) and the weekly report bring the family back (CR-9).

Banned: hearts or lives, XP bars, variable-reward slot mechanics, streak-loss guilt, leaderboards, purchases, ads.

---

## 4. Roles and devices

| Role | Auth | Can do |
|---|---|---|
| Parent | Email and password. Parent session. | Manage children, consent, settings, read recaps and reports, export or delete data. |
| Child | Child token obtained by a parent session, with a PIN if set. | Play only: worlds, journey, sessions, collection, daily quest, own growth. |

A device normally holds a parent session. The parent chooses a child profile, the app enters child mode with a child-scoped token. To leave child mode the parent re-enters the account password (the "parent gate"). A child cannot reach parent screens.

Device classes: phone, tablet and iPad, laptop and desktop, smart TV and large display, kiosk. Input: touch, mouse, keyboard, TV remote (arrow keys and select).

---

## 5. User stories and acceptance criteria

IDs are stable. The implementation plan references them. API operation ids come from `contracts/openapi.yaml`.

### 5.1 Parent

| ID | Story | Acceptance criteria | Operations |
|---|---|---|---|
| P-01 | As a parent I create an account. | Email format and password length (10+) validated inline. A duplicate email shows a clear message with a link to log in. Success lands on the add-child step. | registerParent |
| P-02 | I log in and stay logged in. | Wrong credentials show an explicit message. Session survives reload. Token refresh is invisible, but a failed refresh shows "Your session ended, please log in again" and keeps the current form data. | loginParent, refreshToken |
| P-03 | I add a child profile. | Fields: first name or nickname (max 30), grade 1 to 4, avatar, optional 4-digit PIN. No surname field. Success shows the new profile. | createChild |
| P-04 | I give consent before my child plays. | The privacy notice (versioned) is shown in plain language. Play is blocked until consent is recorded. If a session start returns `consent_missing`, the child sees a "Ask a grown-up" screen and the parent sees a direct link to consent. | recordConsent |
| P-05 | I choose which worlds are available and a daily goal. | At least one world must stay enabled. Daily goal 1 to 5 chapters. Optional daily time limit. Changes are confirmed visibly. | getChildSettings, updateChildSettings |
| P-06 | I turn narration read-aloud and sound on or off. | Toggles save immediately. If the device has no voice for the locale, a message says so and suggests the sound-off alternative. | updateChildSettings |
| P-07 | I read a recap after a session. | Shows skills practiced, attempts, correct count, time, the story so far, and stuck points with a plain-language description of the misconception. Beats told in fallback mode are marked. | getSessionSummary |
| P-08 | I read a weekly report. | Week picker. Shows days played, skills practiced, stuck points, and growth compared with the child's previous period. No ranking against others. | getWeeklyReport, getGrowth |
| P-09 | I see where my child is stuck. | Misconceptions are listed with the skills they affect and one suggestion for what to practice. | getProgress |
| P-10 | I export or delete my child's data. | Export downloads a JSON file. Delete asks for typed confirmation, states it is irreversible, and shows success. | exportChildData, deleteChild |
| P-11 | I switch my child into play mode. | Choosing a profile asks for the PIN when one is set. A wrong PIN says so and allows retry. | createChildToken |
| P-12 | I leave play mode. | Requires the account password. A wrong password is reported. | loginParent |

### 5.2 Child

| ID | Story | Acceptance criteria | Operations |
|---|---|---|---|
| C-01 | I pick who is playing. | Large avatar tiles with names. Under 3 taps to reach worlds. | listChildren (via parent), createChildToken |
| C-02 | I pick a world. | Eight photo tiles, almost no text, each with its accent. The last world is remembered. | listWorlds |
| C-03 | I see my path in a world. | A winding path of chapters. Locked, available, in progress, mastered and needs-review nodes look clearly different without relying on color alone. A big Play button leads to the suggested next chapter. | getJourney |
| C-04 | I play a chapter. | One story, one question, four large choices. See section 7.5 for every state. | startSession, nextBeat, answerBeat, streamNarration |
| C-05 | I see what my answer did to the story. | Each outcome plays a different story beat and animation. Nothing says wrong. No red X. | answerBeat |
| C-06 | I can stop and come back. | Pause keeps the open question. Resume returns to the same beat. Reload mid-chapter resumes it. | pauseSession, resumeSession, getSession |
| C-07 | I finish a chapter. | A chapter-complete moment with a story card, restrained confetti and a soft sound. A "keep going" and a "back to my path" action. | answerBeat (rewards), finishSession |
| C-08 | I earn story cards. | Cards appear in a collection feed, grouped by world, with the story title. | getCollection |
| C-09 | I keep a story-day streak. | Shown on the home and the chapter-complete screen only. A missed day resets it quietly, with no loss animation and no guilt copy. | getEngagement |
| C-10 | I try today's review quest. | Available only when a review is due. Plays as a chapter in a fresh story. | getDailyQuest, startSession |
| C-11 | I see how I grew. | Compares this week with last week for the same child. | getGrowth |
| C-12 | I get a first-time guide. | A guided flow teaches choosing a world, reading a story and answering. Skippable and replayable from the parent settings. | none (local state) |
| C-13 | I land on a home feed that always shows what to do next. | One primary "continue" card first, then quest, worlds, recent cards. Scrolling is smooth and snaps. Works with touch, mouse wheel, keyboard and TV remote. | getJourney, getDailyQuest, listWorlds, getCollection, getEngagement, getGrowth (or the aggregate in CR-10) |

### 5.3 Cross-cutting

| ID | Story | Acceptance criteria |
|---|---|---|
| X-01 | Language follows the device. | First launch picks fr-CA or en-CA from the browser languages, else fr-CA. A switcher exists in the parent area. |
| X-02 | Themes. | Light, dark and high contrast. Follows the system by default. The choice persists. |
| X-03 | Errors are visible. | See section 14. No code path swallows an error. |
| X-04 | Install as an app. | Install prompt guidance, offline shell, correct icons. |
| X-05 | Works on a TV. | Everything reachable with arrow keys and select. Text and targets scale for a 3 m viewing distance. |

---

## 6. Information architecture

```
/                       welcome, redirects by session
/parent/register
/parent/login
/parent                 children list, add child
/parent/children/new
/parent/children/[id]            overview: growth, recent sessions, stuck points
/parent/children/[id]/consent
/parent/children/[id]/settings
/parent/children/[id]/sessions/[sid]   recap
/parent/children/[id]/report           weekly report
/parent/account         language, export, delete
/play                   profile picker (child mode entry)
/play/home              home feed (continue, quest, world teasers, recent cards)
/play/worlds
/play/journey/[world]
/play/session/[id]      story screen
/play/session/[id]/done chapter complete
/play/collection        story card feed
/play/quest             daily quest
/play/me                streak, daily goal, growth
```

Rules:
- `/play/*` requires a child token. `/parent/*` requires a parent session.
- Deep links to a session open the story screen at the current beat.
- Route changes use a shared page transition (section 11).

---

## 7. Screen specifications

Every screen implements these states unless stated: loading (skeleton), empty, error (section 14), offline (section 16), success. Each state has a Storybook story.

### 7.1 Welcome (`/`)

Two big entries: "I am a grown-up" and, when a parent session exists, "Let's play". Shows locale switcher and theme toggle. No marketing copy.

### 7.2 Parent auth and onboarding

Register, login, then a guided three-step setup: add child, read and accept privacy notice, choose worlds and goal. Each step has inline validation and a visible progress indicator (progress indicators are fine in the parent area).

### 7.3 Profile picker (`/play`)

Avatar tiles. PIN pad for protected profiles (`PinInput` component, large keys, no keyboard required). After success, transitions to worlds.

### 7.3b Home feed (`/play/home`)

The child's landing screen after choosing a profile. A vertical, scroll-snap feed of curated cards, continuous and comfortable on phone, tablet, desktop and TV:
1. **Continue** card (open session, or the suggested next chapter) at the top. Always one clear primary action.
2. **Daily quest** card when a review is due.
3. **World teasers**: a card per enabled world with its art and a short hook line, leading to that world's journey.
4. **Recent story cards**: the last cards earned, leading to the collection.
5. **Growth** card: this week against last week.

Rules: all content is curated or the child's own, no user-generated content, no ads, no external links. Infinite scroll uses cursor loading where the list is unbounded (collection); the feed itself is a finite, composed list. `SnapFeed` and `VirtualFeed` are shared primitives, also used by the collection and the parent timeline. The feed loads through a single aggregate request to avoid request waterfalls (CR-10). Reduced motion removes snap easing and parallax. On TV, focus moves card to card with the arrow keys.

### 7.4 World picker and journey

- World picker: eight photo tiles in a calm grid (2 columns phone, 4 columns tablet and up, 4 by 2 on TV). Selecting a tile animates a zoom to that world's journey.
- Journey: a vertical winding path, newest chapter near the bottom, centered on the current node on load. Node states from `NodeState`:
  - `locked`: muted, lock icon, not tappable (tooltip explains "Finish the chapter before it").
  - `available`: pulsing ring, tappable.
  - `in_progress`: half-filled ring.
  - `mastered`: filled, with a shine ring that grows with `level` (0 to 5).
  - `needs_review`: gentle wobble, small refresh badge, tappable.
- A floating Play button starts the suggested chapter (`current_skill_id`). Tapping a node starts that skill.
- The journey is the only place a Duolingo-like structure appears. It never shows a number as a score.

### 7.5 Story screen (`/play/session/[id]`): the core

Layout: illustration area (top or side), narration panel, four choices. Nothing else except the Pause icon.

States, in order:
1. **Starting.** Session created or resumed. Skeleton of the scene.
2. **Requesting beat.** `nextBeat` called with an `Idempotency-Key`. The question is available at once.
3. **Narrating scene.** Status `pending` then `streaming` then `ready` (or `fallback`). Text appears progressively through the SSE stream. If a stream does not start within 6 seconds, a calm message "The story is taking a moment" is shown with a Retry action, and the question stays hidden until narration is ready or the child taps "Show the question".
4. **Question ready.** Four choices, each at least 56 px tall on touch, large on TV. Choices can be a number, text or a pair (quotient, remainder) shown as "48 remainder 4" in a localized format.
5. **Answering.** Tapped choice is locked and highlighted. All choices are disabled to prevent a double submit. If the network drops, an explicit message and a Retry button appear; the retry reuses the same key so the verdict is stored once.
6. **Narrating outcome.** The outcome beat plays (section 11.3), then text streams in.
7. **Outcome shown.** A single "Continue" action. For `correct`, the chosen choice shows a soft success mark. For `erreur_typique` and `erreur_aleatoire`, the UI never shows the correct answer and never marks the choice wrong. The correct answer from the response is kept only for the parent recap.
8. **Rewards.** If `rewards` contains items, they play in order (section 11.4) before Continue.
9. **Next beat or chapter complete.** `session.status = completed` leads to `/done`.

Forbidden on this screen: score, progress bar or dots counting beats, timer, streak, menu, red or shaking error styling, leaderboards.

Pause: icon button in a corner. Opens a small dialog with "Keep playing" and "Take a break". Taking a break pauses the session and returns to the journey.

Read-aloud: when enabled, narration is spoken with the Web Speech API in the active locale. If no voice exists, show a one-time explicit notice (not silent).

### 7.6 Chapter complete (`/play/session/[id]/done`)

Shows the story card earned, story title, streak update when `streak_extended`, a skill power-up note for `skill_mastered`, and `daily_goal_met`. Confetti is brief (under 1.5 s), low density, respects reduced motion. Actions: "Next chapter" and "Back to my path".

### 7.7 Collection (`/play/collection`)

A feed-style vertical scroll of story cards with infinite loading by cursor, grouped by world with sticky headers. Virtualized rendering for long lists. Card tap opens a detail sheet with the title and the date.

### 7.8 Daily quest (`/play/quest`)

If `available`, a quest card with a Play button. If not, a friendly "Nothing to review today" state. If `completed`, a done state.

### 7.9 My growth (`/play/me`)

Streak, daily goal ring (done chapters of target), and "this week compared with last week" in three simple figures (chapters, new skills, minutes). No ranking. No other children.

### 7.10 Parent screens

- Children list: cards with avatar, name, last played, consent badge.
- Child overview: growth, recent sessions timeline (feed-style, cursor paginated), stuck points.
- Recap, weekly report, settings, consent, account: as the stories in 5.1.
- Destructive actions use a confirm dialog with typed confirmation.

---

## 8. Component architecture

### 8.1 Layers

| Layer | Path | Contains | May import |
|---|---|---|---|
| Primitives | `src/ui/<component>/` | Button, IconButton, Icon, Card, Panel, Dialog, Sheet, Toast, NotificationCenter, Banner, InlineError, FormField, Input, PinInput, Avatar, Tabs, Tooltip, Skeleton, Switch, Select, Progress (parent area only), GuidedTour, SnapFeed, VirtualFeed, motion wrappers (Reveal, Pop, Pulse, PageTransition) | tokens, `lib/*` |
| Game widgets | `src/game/<component>/` | ChoiceButton, StoryPanel, NarrationText, IllustrationFrame, JourneyPath, JourneyNode, WorldTile, WorldTeaser, ContinueCard, QuestCard, StreakBadge, DailyGoalRing, StoryCard, RewardBurst, ChapterComplete, MascotBubble, OutcomeBeat | `ui`, `lib/*` |
| Features | `src/features/*` | Hooks and containers wiring widgets to the API (auth, children, play, collection, parent reports) | `ui`, `game`, `lib/*` |
| App | `src/app` | Routes and layouts only | `features`, `ui`, `game` |

### 8.2 Storybook-only policy (enforced, not requested)

- One folder per component (`src/ui/button/`, `src/game/choice-button/`) holding `index.ts`, the component, `*.stories.tsx`, `*.test.tsx`. A script fails the build if any component folder lacks a story, or if a component file exists outside such a folder.
- No barrel files. Consumers import from the component entry (`@/ui/button`), never from a shared `index.ts` that re-exports everything. This follows the Vercel React best practices rule on barrel imports and keeps bundles small.
- `src/app` and `src/features` may not import `@radix-ui/*` or shadcn internals directly. Lint blocks it. Components come from `@/ui/*` or `@/game/*` only.
- Composition rules from the Vercel composition patterns skill: no boolean prop proliferation; use variants, compound components and slots.
- Each story covers: default, every variant, every state (loading, error, disabled), dark theme, high contrast, fr-CA and en-CA, reduced motion, and a TV viewport where relevant.
- Each story passes automated accessibility checks (axe) and has an interaction test where the component is interactive.
- A living inventory table in Storybook docs lists every component, props, and where it is used.

### 8.3 Engineering rules

- SOLID, concretely:
  - Single responsibility: presentational components hold no data fetching; feature hooks hold no markup.
  - Open/closed: variants and slots extend components; no editing a base to add a case.
  - Liskov: every `AudioPlayer`, `Notifier`, `Storage` implementation (real, mock, null) is interchangeable.
  - Interface segregation: small interfaces (`AudioPlayer.play`, `Notifier.notify`) instead of one big service.
  - Dependency inversion: components receive `AudioPlayer`, `Notifier`, `Clock`, `Storage` and the API client through providers, so Storybook and tests inject fakes.
- Composition over duplication: shared hooks (`useReducedMotion`, `useLocaleFormat`, `useSound`, `useApiError`, `useFeed`), motion wrappers, a single `Dialog` base, and a generic state container factory (`createSlice` over Zustand) used by every store.
- Minimal re-renders: stable props, `memo` on list items, state colocated, server components for static parts.
- No one-off styles in screens: spacing and color come from tokens.

---

## 9. Design tokens and themes

Tailwind v4 theme variables hold all tokens. shadcn/ui components are generated into `src/ui` and restyled with these tokens.

### 9.1 Semantic tokens

- Color roles: `bg`, `bg-elevated`, `bg-sunken`, `fg`, `fg-muted`, `border`, `brand`, `brand-fg`, `accent` (per world), `success`, `info`, `warning`, `danger`, `focus-ring`. `danger` is for system errors only.
- Story-outcome colors are separate tokens (`beat-success`, `beat-detour`, `beat-surprise`) and are never red.
- World accents: eight tokens (nature, espace, cuisine, sport, construction, medecine, science, echecs), overridden at runtime by the API's `accent_color`.
- Type: a rounded display face for headings and a highly legible text face for body (self-hosted through `next/font`, license verified). Scale: 12, 14, 16, 18, 20, 24, 32, 40, 56 px with a TV multiplier.
- Spacing scale on a 4 px base. Radii: 8, 12, 20, full. Elevation: 3 levels.
- Motion tokens: durations (120, 200, 320, 600 ms), easings, and a global `--motion-scale` that is 0 under reduced motion.
- Sound tokens: volume levels per category.

### 9.2 Themes

- Light, dark and high contrast, all defined at the token layer.
- Default follows `prefers-color-scheme` and `prefers-contrast`. User override persists (cookie, so the server renders the right theme with no flash).
- Contrast: AA for all text, AAA for body text in high contrast. Contrast is checked on every story.

### 9.3 Visual direction

The prompt forbids generic template design, poor hierarchy and low-trust visuals. Direction:
- **Illustration-forward.** Each world has its own scene art, palette and mood. The story art carries the emotion; the chrome stays quiet.
- **Tactile, rounded, confident.** Chunky shapes, soft depth on interactive elements (buttons look pressable), consistent corner radii. Playful through form and motion, not through clutter or cartoon clichés.
- **Clear hierarchy.** One primary action per screen, big type for the question, generous space. Parent screens are calmer and denser, with a more adult tone.
- **Trust cues.** Plain language, visible privacy and consent wording, consistent iconography, no dark patterns, no fake urgency, no ads.
- **Two registers, one system.** Child area: warm, vivid, spacious. Parent area: neutral, structured. Both use the same tokens.
- **Mascot.** A single consistent guide character with a small set of poses, used in onboarding, empty states and rewards only, never in the way of the story.
- Art and typography are checked in Storybook (a "Foundations" docs page: color, type, spacing, elevation, motion, sound) before screens use them.

---

## 10. Responsive behavior and input

### 10.1 Breakpoints

| Name | Width | Notes |
|---|---|---|
| phone | up to 599 px | One column. Bottom-anchored choices. |
| tablet | 600 to 1023 px | Story on top, choices in 2 by 2 grid. |
| desktop | 1024 to 1919 px | Illustration and narration side by side. |
| tv | 1920 px and up, or `tv` display mode | 10-foot UI: base font x1.5, larger targets, focus ring always visible, overscan-safe margins. |

### 10.2 Rules

- Use dynamic viewport units (`dvh`), safe-area insets, and no fixed heights that clip on small phones.
- Orientation changes keep state and layout intact.
- Touch targets: 48 px minimum, 56 px or more for answer choices.
- Hover is never required. Pointer, touch and keyboard all reach every action.
- TV and keyboard: spatial navigation with arrow keys, Enter to select, Escape or Back to pause. Focus is always visible and never trapped. Tested with a keyboard and an emulated remote.
- Reduced data: images use responsive sizes and `next/image`.

### 10.3 Kiosk and display mode

For shared large screens (classroom, waiting room, event stand), a `?display=kiosk` mode (set once by the parent or an adult in the account area) applies:
- Fullscreen layout with overscan-safe margins and no browser chrome dependence.
- No outbound navigation and no text selection or context menu. Pinch zoom disabled in play.
- Idle reset: after 2 minutes without input on the profile picker or journey, the app returns to the profile picker. A chapter in progress is paused first (never lost).
- Exit requires the parent password.
- Large target and type scale as on TV. Optional attract mode on the profile picker (slow ambient world carousel, reduced-motion aware).

Kiosk is a verified layout and behavior target; hardware-specific work (wake, power, locked-down browser) is out of scope.

---

## 11. Motion system

### 11.1 Library choice

The product prompt asks for research and the lightest practical option. Candidates, with sizes from the Motion documentation (gzipped, minified):

| Option | Size | Strengths | Limits |
|---|---|---|---|
| CSS transforms, keyframes, `@starting-style`, View Transitions | 0 KB JS | Compositor-friendly, free, works with SSR | Hard to sequence long choreography or interrupt |
| Motion `useAnimate` mini | 2.3 KB | WAAPI based, sequencing, tiny | No exit animations, gestures or layout animation |
| Motion `m` + `LazyMotion` + `domAnimation` | about 4.6 KB core plus 15 KB features (about 20 KB) | Variants, exit animations, hover/tap/focus gestures | Heaviest sensible option |
| Motion `m` + `domMax` | about 4.6 KB plus 25 KB | Layout animation, drag | Too heavy for this app |
| Full `motion` component | about 34 KB | Everything | Rejected |
| Lottie runtime | large | Designer files | Rejected (weight) |

Decision: CSS first for hover, press, fades, slides, pulses, skeletons and page transitions. Motion `useAnimate` mini (2.3 KB) only for sequenced reward and outcome choreography. `canvas-confetti` (small, lazy loaded on the reward moment). Exit animations use CSS (`@starting-style` and discrete transitions) behind a tiny `Presence` helper. `LazyMotion` with `domAnimation` is added only if a measured need appears, and that decision is written down as an ADR. Plan P0 includes a spike that measures the real bundle impact (`size-limit`) before this is locked. Animate only `transform` and `opacity`.

### 11.2 Principles

- Motion explains cause and effect and marks significance. It is never decoration.
- 60 fps target on a mid-range phone. No layout-thrashing animations.
- `prefers-reduced-motion` replaces movement with simple fades, shortens durations, and disables confetti. A user toggle exists in the parent settings.

### 11.3 Outcome beats (play screen)

| Outcome | Visual beat | Notes |
|---|---|---|
| `correct` | The hero acts: bright pop, warm light sweep, small upward motion. | Chosen choice gets a soft success mark. |
| `erreur_typique` | A detour: the scene shifts sideways, a new element enters. | Same intensity as success. Never red. Never shakes. |
| `erreur_aleatoire` | A surprise: a gentle swirl or wind effect relaunches the scene. | No correction shown. |

### 11.4 Reward moments

| Event | Animation |
|---|---|
| `card_earned` | Card flips in with a short glow. |
| `chapter_complete` | Brief confetti, title lift. |
| `streak_extended` | Flame badge grows one step. |
| `skill_mastered` | Journey node gains a shine ring. |
| `daily_goal_met` | Goal ring fills and pulses once. |

### 11.5 Other motion

- Page transitions: 200 ms fade and slight slide, direction-aware.
- Journey: path draws on first view, current node pulses.
- Errors: toast slides in with a short attention cue (no shake).
- Loading: skeletons shimmer slowly, not flashing.

### 11.6 Touch, hover and large-screen behavior

- Touch: press feedback in under 100 ms (scale and depth change), no hover-only affordances.
- Hover (pointer devices): lift and glow on tiles, nodes and cards. Disabled on touch through `@media (hover: hover)`.
- Focus (keyboard, remote): the same lift plus a thick, always-visible ring. Focus movement animates smoothly on TV.
- Large screens: transitions are slower (about 1.25 times) and travel farther so they read at distance. Parallax is limited to ambient world backgrounds and off in reduced motion.
- All motion respects `prefers-reduced-motion` and the in-app toggle.

---

## 12. Sound system

- All sound files are downloaded once, stored in `public/sounds`, and precached by the service worker. No hot-linked audio.
- Sources must be permissively licensed (CC0 or equivalent). Candidate sources to verify at download time: Kenney.nl audio packs (stated CC0) and Freesound items filtered to CC0. Pixabay-style custom licenses are not accepted without a documented review. A `public/sounds/LICENSES.md` records the source, author and license of every file. A build check fails if a file is missing from it.
- Formats: WebM/Opus with an MP3 fallback. Each file under 60 KB. Total under 1 MB.
- An `AudioManager` built on the Web Audio API behind an `AudioPlayer` interface. Unlocks on the first user gesture (browser autoplay policy). Respects the child setting, a master mute, and `Page Visibility` (silent in background).
- Event map:

| Event | Sound | Character |
|---|---|---|
| tap, select | `tap` | very short, soft |
| beat correct | `beat_success` | warm, rising |
| beat typical error | `beat_detour` | curious, neutral |
| beat random error | `beat_surprise` | light, airy |
| chapter complete | `chapter_complete` | short fanfare |
| card earned | `card_earned` | sparkle |
| streak extended | `streak_up` | gentle chime |
| system warning | `notice_warning` | soft double tone |
| system error | `notice_error` | low, short (parent area and network failures only) |

- No sound plays on a wrong answer beyond the neutral beat sounds above. Narration read-aloud ducks other sounds.
- If audio fails to load or play, a one-time visible notice is shown and the app continues.

---

## 13. Internationalization

- Library: next-intl. Locales: `fr-CA` and `en-CA`.
- Detection order: saved choice (cookie), then `Accept-Language`, then `fr-CA`. The parent can change it in account settings.
- All user-visible text comes from `messages/{locale}.json`. Lint rule `no-literal-string` blocks hardcoded strings in components. Stories use the same messages.
- ICU MessageFormat for plurals and gender-neutral phrasing. Dates, numbers and times use `Intl` with the locale. Division with remainder is formatted per locale ("48 reste 4" and "48 remainder 4").
- Narrative text comes from the API in the locale sent by `Accept-Language` (contract change request CR-1). The UI never translates narration.
- Copy rules: short, warm, human sentences. No em dashes. No stock AI phrasing ("Certainly", "As an AI", "delve"). A script fails the build if an em dash appears in message files or in story/screen sources.
- Right-to-left is not supported now but logical CSS properties are used to avoid blocking it.

---

## 14. Error handling

### 14.1 Principles

No failure is silent. Each error surfaces through one of these, chosen by context:
- **Inline** next to the field or element for validation.
- **Toast** for transient problems that do not block (a failed save).
- **Banner** for ongoing conditions (offline, session ended).
- **Dialog or full panel** for blocking problems (consent missing, time limit reached).
- **Error boundary** for rendering crashes, with a Retry and a Report action.

Every error message states what happened and what to do next. No raw codes, no stack traces, no blame on the child.

### 14.2 Mapping from the API

The client parses `application/problem+json`. The `code` field selects the message.

| `code` | Where shown | Message and recovery |
|---|---|---|
| `consent_missing` | Child: full panel. Parent: banner with link. | "A grown-up needs to say yes first." Link to consent. |
| `daily_limit_reached` | Child: friendly panel. | "That's enough for today. See you tomorrow." Back to path. |
| `session_active` | Child: dialog. | "You have a chapter in progress." Resume or start over. |
| `session_paused`, `session_completed` | Child: toast then redirect. | Resume or return to the journey. |
| `beat_answered` | Silent-correct: the app loads the stored result. | If loading fails, shows retry. |
| `invalid_pin` | Inline. | "That PIN does not match. Try again." |
| `unauthorized` | Banner then login. | "Your session ended. Log in to continue." Form data kept. |
| `rate_limited` | Toast. | "Slow down a little and try again." |
| `network` | Banner. | "No connection. Check your network and retry." Retry button. |
| `unknown` | Dialog. | "Something went wrong on our side." Retry and copy details for support. |

These codes are contract change request CR-5. Until they exist in the backend, the mock defines them.

### 14.3 Rules

- Every `catch` calls the shared `reportError` that shows the right UI and logs a privacy-safe event.
- Validation uses a shared schema (zod) so the same rule runs in the form and in tests.
- Unhandled promise rejections and boundary errors are caught at the app root.
- Each error state has a Storybook story and a test.

---

## 15. Onboarding

- A guided flow built with a small onboarding toolkit (driver.js wrapped by the shared `GuidedTour` component, styled with tokens, keyboard and screen-reader friendly).
- **Parent first run:** setup wizard (section 7.2).
- **Child first run:** a mascot guides three beats: pick a world, read a short story, tap an answer. The practice problem is chosen from a fixed easy set and the guide never skips the "no wrong answers here" message in kid language.
- Progressive discovery: tips appear in context once, then are dismissed and remembered.
- Skippable at any step. Replay from the parent settings.
- State is stored per child. Until the contract supports it (CR-2), it is stored locally and clearly noted as local.

---

## 16. PWA and offline

- Installable: web manifest (name, icons, maskable icon, theme colors, `display: standalone`), install guidance for iOS and Android.
- Service worker via Serwist. Precaches the app shell, fonts, sounds and core illustrations. Runtime cache for world images and the journey and collection reads (stale-while-revalidate).
- Offline behavior:

| Feature | Offline |
|---|---|
| Open the app, see worlds | Yes (cached) |
| View last-seen journey and collection | Yes, with an "offline" banner |
| Start or continue a chapter | No. Explicit message with a Retry. |
| Answer a question | No. The open beat is kept so the answer can be sent later. |
| Parent edits | Blocked with a message. No silent queueing of destructive actions. |

- Update flow: when a new version is ready, a banner offers "Update now". It never reloads during a chapter.
- Back/forward cache and fast resume are preserved.

---

## 17. Data layer

- **Contract first.** TypeScript types are generated from `contracts/openapi.yaml` (`openapi-typescript`). A CI step regenerates and fails on a diff.
- **Client:** `openapi-fetch` typed client. Server state through TanStack Query with sensible stale times (catalog long, session never cached stale). Client UI state through a small Zustand store.
- **Auth transport:** tokens live in httpOnly, secure, same-site cookies set by Next route handlers (a thin same-origin proxy). Browser code never reads a token. The proxy forwards to `API_URL`. It runs on the Edge runtime (no Node-only APIs) so streaming narration and low latency work on Vercel; public pages are statically generated; secrets are Vercel environment variables, never `NEXT_PUBLIC_*`.
- **Idempotency:** `startSession`, `nextBeat` and `answerBeat` send a fresh `Idempotency-Key` per user action and reuse it on retry.
- **Streaming:** narration uses `EventSource`-style SSE through the proxy. Handles `scene`, `denouement`, `done`, `fallback`, and reconnects once before showing an error.
- **Mock backend:** WireMock, driven by the `contracts/` folder (mappings and body files in `contracts/wiremock/`, shared typed fixtures in `contracts/fixtures/`). Scenarios and response templating give the stateful game loop: three outcomes chosen by the submitted answer, rewards, SSE narration, fallback, consent and limit errors, conflicts. Storybook and unit tests use the same typed fixtures. Flag: `NEXT_PUBLIC_USE_MOCK` selects the mock `API_URL`.
- **Engine boundary test:** a test asserts no pre-answer payload (mock or real) contains the correct answer.
- **Pagination:** cursor based, with virtualized lists for the collection and the parent timeline.
- **Operations not owned by a single story:**
  - `listSessions` feeds the parent session timeline (7.10) and the "last played" line on the children list.
  - `getReviewCalendar` feeds the parent child overview ("coming up for review") and the daily quest availability hint.
  - `listSkills` supplies skill names for stuck points and the weekly report (parent area only).
  - `health` drives the narrator status shown in the parent area ("stories are in offline mode") and the connectivity banner.
  - `sendEvents` sends the privacy-safe event batches described in section 18, flushed on page hide.

---

## 18. Privacy and safety

- Law 25 and consent: no child play before recorded consent. Data export and delete are available to the parent from the UI.
- Data minimization: first name or nickname only, no surname, no photo upload, no free-text fields for children, no precise location.
- Analytics: only the privacy-safe `/events` endpoint. Event names and coarse properties only. No third-party trackers, no ad tech, no fingerprinting.
- Child mode has no external links, no ads, no outbound navigation, no store prompts.
- The parent gate protects every route and action that changes data.
- Secrets never reach the client. Content Security Policy is set strictly. Cookies are httpOnly.
- Logs and error reports exclude names and answers.

---

## 19. Performance, accessibility, testing, deployment

### 19.1 Performance budgets

| Metric | Target (mid-range Android, 4G) |
|---|---|
| LCP of `/play/worlds` | under 2.5 s |
| INP | under 200 ms |
| CLS | under 0.1 |
| Initial JS of the play routes | under 170 KB gzip |
| Animation frame rate | 60 fps, no long tasks over 50 ms during motion |

Server components for static parts, route-level code splitting, `next/image`, font subsetting, lazy load of confetti and onboarding.

### 19.2 Accessibility (WCAG 2.2 AA)

- Semantic HTML, labelled controls, logical focus order, visible focus.
- Screen reader order on the story screen: narration, question, choices. Outcome text is announced through a polite live region.
- Color is never the only signal (node states use shape, icon and label).
- Reduced motion, high contrast, text scaling to 200 percent, no content that flashes more than 3 times a second.
- Read-aloud as an option. Dyslexia-friendly font option is a candidate for a later release (section 21).

### 19.3 Test strategy

| Level | Tool | What |
|---|---|---|
| Unit | Vitest | utils, formatters, error mapping, state machines |
| Component | Testing Library and Storybook interaction tests | every component and state |
| Visual and a11y | Storybook test-runner with axe | every story, all themes and locales |
| Contract | type regeneration check and WireMock mapping validation | no drift |
| End to end | Playwright with axe | parent signup to child chapter to recap, offline, TV keyboard flow |
| Performance and PWA | Lighthouse CI | budgets and installability |
| Engine boundary | dedicated test | no answer before answering |

### 19.4 Deployment

- Vercel from day one. Static generation where possible, edge-safe middleware limited to locale detection.
- Environment variables: `API_URL`, `NEXT_PUBLIC_USE_MOCK`, `NEXT_PUBLIC_APP_ENV`. Preview deployments per pull request run with the mock backend.
- Region preference: Canada, subject to the privacy review (section 21).
- Edge-safe architecture: proxy and middleware avoid Node-only APIs; static generation for public routes; per-environment variables; no secrets in the client bundle.

### 19.5 Tooling: Vercel agent skills and templates

The product prompt requires the Vercel agent skills resources and the React best practices template in setup and planning. From `vercel.com/docs/agent-resources/skills` (page dated 2026-09-15), the skills that apply, installed with `npx skills add <owner/repo> --skill <name>`:

| Skill | Use here |
|---|---|
| `vercel-react-best-practices` (also via `npx claude-code-templates@latest --skill development/react-best-practices`, as the prompt specifies) | 40+ performance rules: no request waterfalls, small bundles, no barrel imports, server component boundaries. Applied to every feature review. |
| `vercel-composition-patterns` | Component API design without boolean prop sprawl (section 8.2). |
| `web-design-guidelines` | 100+ rules on accessibility, performance and UX. Run on every phase's UI code as part of the exit gate. |
| `building-components` | Accessible, composable, themeable components (Storybook-first work). |
| `next-best-practices` | File conventions, RSC boundaries, data patterns. |
| `vercel-deploy` and `vercel-cli` | Deployment workflow in P7. |

Installing runs third-party code. Each install is reviewed (what files it wrote, where) and committed on its own, as described in the plan (P0). Rules extracted from these skills are already reflected in this spec: no barrel files (8.2), single aggregate request for the home feed (CR-10), server components for static parts (19.1), Edge-safe proxy (17).

---

## 20. Verification gate

The product prompt requires proof before any phase advances. Each item has automated or recorded evidence.

| # | Rule from the product prompt | Evidence required |
|---|---|---|
| 1 | Design system and Storybook inventory complete for planned screens | Inventory table matches the screen specs; story-coverage script passes |
| 2 | Every required component exists in Storybook before use | Import-boundary lint passes; no `app` import of raw Radix/shadcn |
| 3 | All user-facing errors visible, explicit, actionable | Error-state stories and tests for every `code` in section 14 |
| 4 | No silent failures or hidden fallbacks | Lint for empty `catch`; narration fallback and audio failure notices tested |
| 5 | Onboarding defined for first-time users | Playwright first-run flow passes |
| 6 | Sound planned or implemented, packaged locally | `public/sounds` present, `LICENSES.md` complete, build check passes |
| 7 | Defaults to device language | Playwright with `Accept-Language` fr and en |
| 8 | Motion supports completion, warning, progress feedback | Stories for every reward and outcome beat; reduced-motion test |
| 9 | No AI-like wording, no em dashes | Em-dash and literal-string checks pass; copy review |
| 10 | Respects the deterministic engine boundary and docs | Engine boundary test; screen specs reviewed against `NUMERIX_CONTEXT.md` |
| 11 | Theme, PWA, responsive accounted for | Theme stories, Lighthouse PWA pass, viewport matrix pass |
| 12 | Not rushed for developer tempo | Phase exit reviews recorded in the plan |

Any unchecked item stops the phase. The phase gate checklist lives in `Services/frontend/IMPLEMENTATION_PLAN.md`.

---

## 21. Contract change requests and open questions

### Contract change requests

| ID | Change | Why |
|---|---|---|
| CR-1 | Honor `Accept-Language` on catalog and narration endpoints; localized world, skill and node titles | fr-CA and en-CA from day one |
| CR-2 | Add `onboarding_completed` per user (parent and child) | Persist the guided flow across devices |
| CR-3 | Add an avatar and mascot catalog endpoint | Avoid hardcoding avatars |
| CR-4 | Add 429 and 5xx responses to every operation | Complete error handling |
| CR-5 | Define the `Problem.code` vocabulary in section 14.2 | Stable client error mapping |
| CR-6 | Add `fallback` flag to `Beat` and `AnswerResult` narration, and expose it in `SessionSummary` | Parent recap marks fallback beats |
| CR-7 | Add a parent password re-check endpoint (or document use of login) | The parent gate |
| CR-8 | Add the parent-visible list of misconception suggestions text | P-09 suggestion line |
| CR-9 | Parent web push subscription and reminder preferences | Optional parent reminders (3.4) |
| CR-10 | Add `GET /children/{id}/home`, one aggregate for the home feed (suggested chapter, quest, world teasers, recent cards, engagement, growth) | Avoid request waterfalls on the landing screen |

### Open questions

1. Which git repository will hold `Services/frontend` and `contracts/`? Neither is inside the `Services/numerix-` repository.
2. Source of illustrations, world photos, mascot art and avatars.
3. Source of sound assets (CC0 packs to verify) and the voice for read-aloud.
4. Hosting region and any data residency requirement for children's data.
5. Dyslexia-friendly font option and a calm mode for sensory needs.
6. Whether TV is a first-release target or a verified-capable layout only.
7. Scope of the first playtest build (five children) and which worlds it includes.

---

## 22. Configuration, mascot, UI libraries, motion kits, Vercel

Added after the owner's decisions of 2026-10-12.

### 22.1 Config-first development

Anything that varies by environment, brand, device or rollout is configuration, not code.
- One typed `config/` module, validated with zod at build time and at server start. The build fails on an invalid or missing required value. No `process.env` access outside it (lint rule).
- `.env.example` documents every variable with its type, default and meaning. Storybook reads the same config.
- Variables (initial set):

| Variable | Scope | Default | Purpose |
|---|---|---|---|
| `API_URL` | server | WireMock URL | Backend base URL for the same-origin proxy |
| `NEXT_PUBLIC_USE_MOCK` | client | `true` until the real backend exists | Shows a visible "demo data" badge when true |
| `NEXT_PUBLIC_APP_ENV` | client | `development` | `development`, `preview`, `production` |
| `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_LOCALES` | client | `fr-CA`, `fr-CA,en-CA` | Language set |
| `NEXT_PUBLIC_MASCOT_ENABLED` | client | `true` | Turns the mascot on or off everywhere |
| `NEXT_PUBLIC_MASCOT_KIND` | client | `emoji` | `emoji`, `image`, `lottie`, `rive` |
| `NEXT_PUBLIC_MASCOT_EMOJI` | client | a single emoji | Used when kind is `emoji` |
| `NEXT_PUBLIC_MASCOT_SRC` | client | empty | Asset path for non-emoji kinds |
| `NEXT_PUBLIC_FEATURE_FEED`, `_KIOSK`, `_TV`, `_READ_ALOUD` | client | `true` | Feature flags |
| `NEXT_PUBLIC_SOUND_DEFAULT` | client | `true` | Default sound setting for new profiles |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | client | `true` | Privacy-safe events on or off |

`NEXT_PUBLIC_*` values are inlined at build time, so changing one needs a redeploy. If a value must change without redeploying, it moves to Vercel Edge Config behind the same config module (no screen code changes).

### 22.2 Pluggable mascot

- A `MascotProvider` exposes `{ enabled, kind, render(pose) }`. Adapters implement one small interface (`MascotAdapter`) for `emoji`, `image`, `lottie` and `rive`. Only `emoji` ships now.
- `NEXT_PUBLIC_MASCOT_ENABLED=false` removes the mascot everywhere with no layout hole: every component that shows it has a layout that works without it (Storybook stories cover both states).
- The mascot is decorative by default (`aria-hidden`), with text carrying the meaning. Poses are a fixed vocabulary (`greet`, `cheer`, `think`, `rest`) so a later image or animation set maps one to one.
- Mascot speech comes from locale messages, never hardcoded.

### 22.3 UI library policy

Default is Tailwind CSS plus shadcn/ui (product prompt). Material UI may be used where it matters, under these rules:
- Only for complex widgets that are costly to build well (date pickers, data grids, rich selects) and mostly in the parent area. The child area stays on Tailwind and shadcn.
- Every MUI use is wrapped in `src/ui/<name>/` with a story, imported by path (no barrel), themed from our tokens (CSS variables bridged into the MUI theme), SSR-configured for the App Router.
- Each use needs an ADR with the measured bundle delta against the budgets (spec 19.1) and the alternatives considered. A rejected ADR means the widget is built with shadcn and Radix.
- Charts, if needed, follow the same rule (one chart library, one ADR).

### 22.4 Motion kit policy

Motion libraries are chosen by what is being built, in this order, moving down only when the level above cannot do the job (spec 11.1 has the sizes):
1. CSS transforms, keyframes, `@starting-style`, View Transitions.
2. Motion `useAnimate` mini (2.3 KB) for sequences.
3. `LazyMotion` with `domAnimation` (about 20 KB) for exit animations and gestures.
4. Lottie or Rive only for real mascot or illustration animation assets, behind the mascot adapter or a dedicated reward component, lazy loaded.
5. `canvas-confetti` for celebration bursts, lazy loaded.
Each step beyond level 1 needs an ADR with the measured size and the use it unlocks. Libraries are lazy loaded and never in the initial play-route bundle unless the ADR shows it fits the budget.

### 22.5 Vercel deployment and its configuration

- Team slug `numerix`, project `numerix-web`, repository `github.com/Perrin-Nj/numerix-web`, production branch `main`, a preview deployment per pull request. Domain: the free `*.vercel.app` domain for now.
- Vercel settings live in the repo, not in the dashboard:
  - `vercel.ts` (with `@vercel/config`, Vercel's own config-as-code file, run at build time) holds regions, security headers and CSP, and cache rules. Tunable values come from environment variables with safe defaults (`VERCEL_REGIONS`, `IMAGE_HOSTS`, `CONNECT_ORIGINS`).
  - `config/env/production.env` and `config/env/preview.env` hold the non-secret variable values. `scripts/vercel-env.mjs diff|push <environment>` compares and syncs them with the project through the Vercel CLI. Every variable must be documented in `.env.example`.
- Preview protection: Vercel protects previews by default. Sharing a preview with playtest families needs a deliberate setting (protection bypass link or turning it off for one project); this is an explicit decision, recorded in the log.
- The first production deploy runs with `NEXT_PUBLIC_USE_MOCK=true` against a hosted WireMock. WireMock needs a JVM or Docker host, which Vercel does not provide, so the mock is hosted elsewhere (decision pending in plan section 11).
- Region: `yul1` (Montreal, Canada) exists on Vercel (docs checked 2026-10-12) and is the default in `vercel.ts`.

### 22.6 Backend requirements live in the contract folder

Every backend need discovered while building the frontend is recorded in the same pull request that creates it:
1. `contracts/openapi.yaml` updated.
2. `contracts/BACKEND_REQUIREMENTS.md` updated (what, why, which screen needs it, status).
3. A WireMock mapping and a typed fixture added or changed.
4. Types regenerated; CI fails if any of these is missing or inconsistent.
The change requests CR-1 to CR-10 in section 21 move to `contracts/BACKEND_REQUIREMENTS.md`, which is now their source of truth.
