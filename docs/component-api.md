# Component API (Storybook-first)

Contract between the component authors and the screen authors. Read `docs/PRODUCT_PROMPT.md` and sections 8, 9, 11, 12, 13, 14 of `docs/frontend-spec.md` first. The product prompt is the guiding document.

## Rules for every component

1. One folder per component: `src/ui/<kebab-name>/` (primitives) or `src/game/<kebab-name>/` (domain widgets). Files: `<Name>.tsx`, `index.ts` (re-exports the component and its prop types), `<Name>.stories.tsx`, `messages.fr-CA.json`, `messages.en-CA.json` (only if the component has text). No barrel files above the folder. Consumers import from `@/ui/<name>` or `@/game/<name>`.
2. Client components start with `'use client'` only when they need state, effects or browser APIs.
3. Styling: Tailwind v4 utility classes using the token utilities defined in `src/app/globals.css` (`bg-bg`, `bg-elevated`, `bg-sunken`, `text-fg`, `text-muted`, `border-line`, `bg-brand`, `text-brand-fg`, `bg-brand-soft`, `text-success`, `text-danger`, `bg-beat-success`, `bg-beat-detour`, `bg-beat-surprise`, `bg-world-<id>`, `rounded-md`, `shadow-1`, `shadow-press`, `font-display`, etc.). Never hardcode colors. Use `cn` from `@/shared/cn`. CSS keyframes available as classes: `nx-pop`, `nx-rise`, `nx-pulse`, `nx-skeleton`, and `lift` (hover/press feedback). Use CSS for motion; the `motion` package only if CSS cannot do it.
4. Text: no hardcoded user-facing strings. Use `useTranslations('<namespace>')` from `next-intl`. Namespace = `ui.<name>` or `game.<name>` (camelCase name). Put the keys in the component's own `messages.<locale>.json` as nested JSON starting with the top-level `ui` or `game` key, e.g. `{"ui":{"dialog":{"close":"Fermer"}}}`. Provide both fr-CA and en-CA. Run `pnpm gen:messages` after changes (merges all fragments; duplicate keys fail). Copy rules: short, warm, human; NO em dashes (the character U+2014 is banned everywhere); no stock AI phrases.
5. Accessibility: semantic HTML, labelled controls, visible focus (global style exists), minimum touch target 48px (56px for answer choices), do not rely on color alone, respect reduced motion (tokens already scale durations to 0; do not add JS motion without checking `useReducedMotion` from `@/platform/motion`). Errors use `role="alert"`; polite live regions for streamed text.
6. Sound: `useSound()` from `@/platform/audio` returns `{ play(name) }` (safe without a provider). Names: `tap`, `beat_success`, `beat_detour`, `beat_surprise`, `chapter_complete`, `card_earned`, `streak_up`, `notice_warning`, `notice_error`.
7. Themes: must look right in `light`, `dark`, `hc` (high contrast) and at TV scale (`data-display="tv"`). The Storybook toolbar switches these.
8. Stories (CSF3, `import type { Meta, StoryObj } from '@storybook/nextjs-vite'`): `title: 'ui/Button'` or `'game/ChoiceButton'`, `tags: ['autodocs']`, a Default story, one story per variant and per state (loading, empty, error, disabled where relevant), and interactions via `play` functions only when the component is interactive. The global decorator already provides intl, theme, audio (null player). Stories use typed fixtures; keep sample data inline and small.
9. SOLID/composition: small single-purpose components, variants through props (no boolean prop sprawl), compound components for multi-part widgets, props typed and exported. Memoize list items.
10. No component imports from `src/features` or `src/app`. UI primitives may not import game widgets. Game widgets may import UI primitives (`@/ui/...`) and `@/lib/...`.
11. API types come from `@/data/api/types` (generated from `contracts/openapi.yaml`).
12. Verify before finishing: `pnpm gen:messages && pnpm typecheck && pnpm check:stories && pnpm check:copy && pnpm lint` all pass. Do not run Storybook dev servers in the background. Do not write unit tests (owner decision); stories are the verification.

## Primitives (`src/ui`)

| Folder | Exports | Props and behavior |
|---|---|---|
| `button` | `Button` | `variant: 'primary'\|'secondary'\|'ghost'\|'danger'`, `size: 'sm'\|'md'\|'lg'\|'xl'`, `loading?`, `iconLeft?`, `iconRight?`, `fullWidth?`, plus button attrs. Primary is tactile (`shadow-press`, presses down on active). Calls `play('tap')` on click. min-height 48px (md), 56px (lg), 72px (xl). |
| `icon-button` | `IconButton` | `label` (required, becomes aria-label and tooltip), `icon: ReactNode`, `variant`, `size`. |
| `icon` | `Icon` | `name` from a fixed registry mapped to lucide-react: `lock check play pause star flame sparkles volume volume-off settings user users plus x chevron-right chevron-left home book trophy refresh wifi-off alert info eye eye-off moon sun globe log-out shield trash download map`, `size?`, decorative by default (`aria-hidden`), optional `title`. |
| `card` | `Card`, `CardHeader`, `CardBody`, `CardFooter` | `tone: 'plain'\|'brand'\|'sunken'`, `interactive?` (adds `lift`, focus ring, renders as button/anchor via `asChild`). |
| `panel` | `Panel` | `title?`, `tone`, `padded?` section container for screens. |
| `dialog` | `Dialog` | Radix dialog. `open`, `onOpenChange`, `title`, `description?`, `children`, `footer?`, `tone?: 'default'\|'danger'`, `dismissible?` (default true). Focus trap, escape closes if dismissible. |
| `sheet` | `Sheet` | `open`, `onOpenChange`, `title`, `side: 'bottom'\|'right'`, `children`. |
| `notification-center` | `NotificationCenter`, `useNotify`, `useNotificationStore` | Toast stack (popups). `useNotify()` returns `{ notify(n), dismiss(id) }`, `n = { id?, kind: 'success'\|'info'\|'warning'\|'error', title, description?, action?: {label, onClick}, durationMs? }`. Errors and warnings persist until dismissed unless `durationMs` set. Warning and error call `play('notice_warning'/'notice_error')`. Polite live region (assertive for errors). Zustand store. `NotificationCenter` is mounted once in the app providers. |
| `banner` | `Banner` | `tone: 'info'\|'success'\|'warning'\|'danger'`, `title`, `description?`, `action?: {label, onClick}`, `onDismiss?`. Full-width, for ongoing conditions (offline, session ended). |
| `inline-error` | `InlineError` | `message`, `recovery?`, `id?`. `role="alert"`, icon + text. |
| `form-field` | `FormField` | `label`, `htmlFor`, `hint?`, `error?`, `required?`, `children`. Wires aria-describedby by convention (`${htmlFor}-hint`, `${htmlFor}-error`). |
| `input` | `Input` | `invalid?`, input attrs, forwardRef, 48px min height. |
| `pin-input` | `PinInput` | `length=4`, `value`, `onChange`, `onComplete?`, `disabled?`, `error?`, `label`, `keypad=true` (big on-screen keypad 0-9 + backspace so a child can use touch or remote). |
| `select` | `Select` | `options: {value,label}[]`, `value`, `onValueChange`, `placeholder?`, `label`. Radix select. |
| `switch` | `Switch` | `checked`, `onCheckedChange`, `label`, `description?`. |
| `avatar` | `Avatar` | `avatarId: string`, `name`, `size: 'sm'\|'md'\|'lg'`. Placeholder art: map ids `fox owl bear cat panda rabbit lion turtle` to emoji on a soft colored disc; unknown id falls back to the first letter of `name`. |
| `tabs` | `Tabs` | `items: {value,label,content}[]`, `defaultValue`. |
| `tooltip` | `Tooltip` | `content`, `children`. |
| `skeleton` | `Skeleton` | `className?`, `width?`, `height?`, `shape: 'line'\|'block'\|'circle'` using the `nx-skeleton` class. |
| `progress` | `Progress` | `value`, `max`, `label`. Parent area only (the play screen never shows progress bars). |
| `page-container` | `PageContainer` | `width: 'narrow'\|'default'\|'wide'`, `children`; centers content, safe-area padding. |
| `app-header` | `AppHeader` | `title`, `left?`, `right?` slots; sticky; used by parent screens and the journey. |
| `guided-tour` | `GuidedTour` | Wraps `driver.js`. `steps: {target?: string (CSS selector), title, description}[]`, `open`, `onClose`, `onFinish`, `labels` come from messages (next, back, skip, done). Keyboard accessible, themed with tokens, respects reduced motion. Steps without target are centered popovers. |
| `snap-feed` | `SnapFeed` | `ariaLabel`, `children` (cards). Vertical scroll-snap container (`scroll-snap-type: y proximity`), items `snap-start`; ArrowUp/ArrowDown/PageUp/PageDown move focus between items; works with TV remote (arrow keys); reduced motion removes smooth scrolling. |
| `virtual-feed` | `VirtualFeed<T>` | `items: T[]`, `renderItem(item, index)`, `getKey(item)`, `estimateSize`, `hasMore`, `loadMore`, `loading?`, `ariaLabel`, `groupBy?: (item)=>string` (sticky group headers), empty and error slots. Uses `@tanstack/react-virtual`. |
| `reveal` | `Reveal` | `delayMs?`, `as?`, `children`; fade/rise on mount using the `nx-rise` class. |
| `pop` | `Pop` | `children`; scale-in using `nx-pop`. |
| `pulse` | `Pulse` | `active?`, `children`; `nx-pulse`. |
| `page-transition` | `PageTransition` | `children`; 200ms fade+slide on route change (CSS only, keyed by pathname via `usePathname`). |

## Game widgets (`src/game`)

| Folder | Exports | Props and behavior |
|---|---|---|
| `mascot` | `Mascot`, `MascotAdapter` (type), `emojiAdapter` | `pose: 'idle'\|'wave'\|'think'\|'cheer'\|'sad'\|'sleepy'` (old `greet rest curious amazed happy` still map onto them), `size: 'sm'(48px)\|'md'(120px)\|'lg'(240px)`, `speaking?`, `look?`, `decorative?`. Reads `appConfig.mascot` from `@/config/app`; returns `null` when disabled. Adapters implement `MascotAdapter { render(pose, size): ReactNode }`; `owl` (default) lazy loads Numa, the SVG owl (`role=img`, label per pose, `aria-hidden` when `decorative`); `emoji` is the fallback and `image`/`rive` fall back to it with a console warning in development. Accepts an optional `config` prop override for stories. |
| `mascot-bubble` | `MascotBubble` | `pose`, `children` (text), `size`. Bubble works with or without the mascot (mascot disabled: bubble only, no layout hole). |
| `choice-button` | `ChoiceButton` | `value: AnswerValue`, `index: number` (0-3, shows letter chip A-D and listens for keys 1-4 when `shortcut` true), `state: 'idle'\|'selected'\|'locked'\|'success'`, `onSelect(value)`, `shortcut?`. Display text via `useFormatAnswer()` from `@/platform/format`. 56px+ height (88px at TV scale), `play('tap')` on select. `success` shows a soft check, never an error style. There is NO wrong state. |
| `story-panel` | `StoryPanel` | Layout slots: `illustration`, `narration`, `question?`, `choices?`, `footer?`. Responsive: phone stacked, tablet story above 2x2 choices, desktop/TV side by side. No progress, no score. |
| `narration-text` | `NarrationText` | `text: string \| null`, `status: 'pending'\|'streaming'\|'ready'\|'fallback'`, `slow?: boolean` (shows a calm "taking a moment" message with `onRetry`), `onRetry?`. Skeleton lines while pending, text with `aria-live="polite"`, in `fallback` shows a small non-blocking notice line (never silent). Large readable type (`font-display`). |
| `illustration-frame` | `IllustrationFrame` | `world: WorldId`, `src?: string \| null`, `alt`, `mood?: 'idle'\|'success'\|'detour'\|'surprise'`. No art yet: gradient from `bg-world-<id>` plus a big world emoji (`nature` 🌿, `espace` 🚀, `cuisine` 🍳, `sport` ⚽, `construction` 🏗️, `medecine` 🩺, `science` 🔬, `echecs` ♟️). With `src`, uses `next/image`. Mood adds a CSS animation class. |
| `outcome-beat` | `OutcomeBeat` | `outcome: Outcome`, `children`. Wraps content with the outcome's visual beat (success: pop + warm glow; typical error: sideways slide + new element; random: gentle swirl). Same visual weight for all three. Never red, never shakes. Plays the matching sound once on mount (`beat_success`, `beat_detour`, `beat_surprise`). |
| `world-tile` | `WorldTile` | `world: World`, `selected?`, `onSelect(world)`, `size: 'md'\|'lg'`. Photo-style tile (gradient + emoji until art exists), name, almost no text. |
| `world-teaser` | `WorldTeaser` | `world: World`, `onOpen(world)`. Feed card with the `hook` line. |
| `continue-card` | `ContinueCard` | `label`, `world: WorldId`, `hasOpenSession: boolean`, `onContinue()`. The one primary action of the home feed. |
| `quest-card` | `QuestCard` | `quest: DailyQuest`, `onPlay()`. States: available, not available (friendly), completed. |
| `journey-node` | `JourneyNode` | `node: JourneyNode` (from `@/data/api/types`), `accent?: string`, `current?: boolean`, `onSelect(node)`. States via shape + icon + label, not color alone: locked (lock, disabled), available (pulse ring), in_progress (half ring), mastered (filled, shine ring by `level` 0-5), needs_review (gentle wobble + refresh badge). |
| `journey-path` | `JourneyPath` | `nodes: JourneyNode[]`, `world: WorldId`, `currentSkillId?: string \| null`, `onSelectNode(node)`, `onPlay()`. Winding vertical path using `node.position.col` (0-4) and row order, connectors, floating Play button (uses `Button`), scrolls to the current node on mount. |
| `streak-badge` | `StreakBadge` | `days: number`. Flame icon + count + label. No loss state. |
| `daily-goal-ring` | `DailyGoalRing` | `done`, `target`. SVG ring; fills with CSS transition; pulses once when met. |
| `story-card` | `StoryCard` | `card: StoryCard`, `onOpen?`, `variant: 'tile'\|'reveal'`. Reveal flips in (CSS) with a glow. |
| `reward-burst` | `RewardBurst` | `reward: Reward`, `onDone()`. Popup per reward type (`card_earned` card flip + `card_earned` sound, `chapter_complete` brief confetti via lazy `canvas-confetti` + `chapter_complete` sound, `streak_extended` flame grows + `streak_up`, `skill_mastered` shine, `daily_goal_met` ring pulse). Confetti off under reduced motion. Auto-advance not allowed; user taps Continue. |
| `chapter-complete` | `ChapterComplete` | `title?`, `rewards: Reward[]`, `streakDays?`, `onNext()`, `onBack()`. Orchestrates `RewardBurst`s in order then shows the two actions. Uses `MascotBubble` for a short congratulation line. |

## Providers and libs that already exist (do not rewrite)

`@/shared/cn`, `@/data/api/types`, `@/platform/audio` (`useSound`, `NullAudioPlayer`), `@/platform/motion` (`useReducedMotion`), `@/platform/format` (`useFormatAnswer`), `@/platform/theme` (`useTheme`), `@/config/app` (`appConfig`).
