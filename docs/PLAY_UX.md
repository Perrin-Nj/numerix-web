# Play experience (phase 5)

How the kid screens work after the 20-world question bank: map, world page, every question kind, feedback, data loading and credits. Written with the research below; the iteration log at the end records what the screenshots changed.

## Research (what we took, what we refused)

Web search results were mostly blogs and secondary pages; only claims that several sources agree on, or that match a primary document we know, are used.

| Topic | Source | Taken |
|---|---|---|
| Duolingo lesson flow | [Fun in Every Frame](https://60fpsdesign.substack.com/p/fun-in-every-frame), [Duolingo onboarding teardown](https://screensdesign.com/articles/duolingo-onboarding-design/), [Duolingo growth case study](https://nogood.io/2023/10/09/duolingo-case-study), [streak mechanics](https://duolingo.deconstructoroffun.com/mechanics/streaks) | A lesson is a row of short exercises under a thin bar that fills with an eased animation; small rewards at checks; no clock on a lesson, so no urgency. We take the bar, the fill ease (about 600 ms spring) and the small celebrations. We refuse hearts, lives, leagues and loss framing. |
| Kids game question UX | [Playful interfaces for children (UXPA)](https://oldmagazine.uxpa.org/?p=11776), [Designing smarter touch interfaces for education (UF)](https://init.cise.ufl.edu/designing-smarter-touch-based-interfaces-for-educational-contexts/) | Fitts' law: bigger targets for children, and children (7 to 10) miss targets and gestures more than adults. Every target is at least 44 px, keypad keys 48 px, answer cards 60 px; taps are the main input, drag is always optional. |
| Juicy but light feedback | [The juice problem](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design), [Feedback in games and learning](https://karlkapp.com/?p=1730) | Feedback must stay readable and coherent; too much juice hides the information. Right = one colour change, one bounce, a few particles, owl cheer. Wrong = amber tint, owl "think", a kind note and the method picture. No shake, no red, no sound of failure. |
| Drag and drop on touch | [dnd-kit accessibility guide](https://dndkit.com/guides/accessibility), [dnd-kit keyboard sensor](https://dndkit.com/legacy/api-documentation/sensors/keyboard) | Drag needs a keyboard path (focus, arrows, announcements). We did not add the dependency: ordering uses tap-to-place first, pointer events with `touch-action: none` on a 44 px handle second, arrow keys third. About 100 lines instead of a library. |
| World map design | [Designing a level select interface](https://itch.io/devlog/56371/designing-a-level-select-interface.amp), [level select thread](https://forum.quartertothree.com/t/level-select-map-question/68036) | Grid suits touch; a trail leading to a picture is more exciting than dots; reveal what is reachable, show locks plainly. 20 worlds = photo cards in a 2, 3 or 4 column grid; quests = a winding path with a photo in each node. |
| Responsive images and blur-up | [Spatie responsive images](https://spatie.be/docs/laravel-medialibrary/v10/responsive-images/getting-started-with-responsive-images), [image optimisation reference](https://cdn.jsdelivr.net/npm/@hegemonart/get-design-done@1.60.4/reference/image-optimization.md), [LQIP preview](https://dev.to/dsheiko/how-to-create-a-kick-ass-image-preview-with-lqip-3e6a); also web.dev "Learn Images" and MDN `srcset`/`sizes` (known references) | `srcset` + `sizes`, a tiny blurred preview under the sharp image, a dominant colour behind both, width and height to avoid layout shift. The API already ships `lqip`, `color` and `srcset`; the page only wires them (`MediaImage`). No `next/image`: the files are already resized and immutable. |
| View transitions | [View Transitions API guide](https://flaviocopes.com/view-transitions-api), [view transitions checklist](https://frontendchecklist.io/rules/css/view-transitions) | Shared element = same `view-transition-name` on both pages; switch the animation off under reduced motion. We use React's `<ViewTransition name="world-<id>">` (already used by the page transition) on the card photo and the world header. |
| Caching and retry | [TanStack Query important defaults](https://www.mintlify.com/tanstack/query/guides/important-defaults), [same, tanstack.com](https://tanstack.com/query/latest/docs/framework/angular/guides/important-defaults) | Stale-while-revalidate, capped exponential back-off. The next question is a `fetchQuery` with `staleTime: Infinity`, 2 retries and 400/800 ms back-off, keyed by answered count. |

## Decisions

- Product prompt says "no progress bar on the play screen". This phase's brief asks for a progress bar, so there is one: a thin bar in the top bar. It never shows a number, a score or a timer, and it is a `progressbar` for screen readers with the text "Question 2 of 5". Everything else in the original rule (no score, no red, no timer) stands.
- Question input is chosen from `question.kind`, with cards winning whenever `choices` is not empty (generated questions always send four). An unknown kind without choices becomes the keypad, as the contract says.
- `estimate` questions arrive without a range and without choices (the range is server-side), so they use the keypad. The slider exists (`EstimateInput`) and is used when a number-line visual states `min` and `max`. If the backend sent the range, the slider would be the nicer input.
- Grid visuals come in two conventions in the bank. 1-based (no coordinate is 0): x from the left, y from the bottom, drawn with axis numbers. 0-based (some coordinate is 0): column and row from the top left, no axis numbers. Labels shrink to the cell and long ones are cut with a tooltip; the accessible name lists the labels with counts.
- Worlds without an approved `hero` use their first scene photo; with neither, a gradient from `accent_color` with the world emoji. New world ids reuse the nearest of the original eight for the drawn outcome animations (`SCENES`, `BUILD`) until they get their own.
- Nothing is said about a path that has not been started: no "0 percent" on a card. A ring appears at 1 percent.
- Progress rings need the journey of each world. The map asks for it only for cards that scroll within 300 px of the screen, so 20 worlds are never 20 requests at once.
- Next question: after an answer is graded the next beat is requested at once and its pictures are warmed (`preloadMedia`); Continue reads the cached promise. If that fails the normal request runs again on Continue and the error screen has Retry. The server rule "different type from the previous beat" gives the "different next exercise" after a miss.
- Assets: `/assets/*` is rewritten to the API in `next.config.ts`, so the immutable cache headers reach the browser; the service worker caches `/assets/` cache-first for offline replays.
- Credits: `/credits` (public) lists `GET /credits`; the `CreditsLink` component is on Me and can be placed in settings or a footer.

## Question kinds and how each is answered

| Kind | Input | Answer sent |
|---|---|---|
| choice, word, visual (with cards), generated | 2 to 5 cards, letters A to E, keys 1 to 5 | value of the card |
| numeric, estimate without range | keypad: digits, minus, decimal mark, erase, Check; two fields when the statement asks for a remainder | number, or `[quotient, remainder]` |
| truefalse | two big buttons | boolean |
| order | tap cards into slots; drag by the number handle; arrow keys; Delete takes back | item ids in order |
| match | tap a card on the left, then its partner on the right; paired cards share a number | `[[left, right], ...]` |
| estimate with a number line | slider, 44 px thumb | number |
| visual | bars, pictograph, clock, number line (0.1 steps), grid, fraction, dice drawn from data | with the kind's input |

Media: a `scene` photo is the stage (full when alone, a soft backdrop under a graph or counting picture); an `object` sprite replaces the emoji in the counting picture.

## Motion rules kept

Only transform and opacity; every animation under 600 ms except the mascot idle; reduced motion = fades only, no parallax, no particles, bar fills instantly; no timer anywhere; confetti module loaded on demand.

## Iteration log

1. First screenshots (360 px): world cards showed "0 pour cent" on every card and the real photos were missing (the API sets no `hero`, only `scenes`). Fixed: hide empty progress, fall back to the first scene photo.
2. First question screenshots: the question text was cut off behind the cards and keypad because it scrolled inside the story region; the photo stage took 38 percent of the height. Fixed: the question stays in view above free inputs, the stage shrinks to 28 percent (cards) or 20 percent (keypad, ordering, matching), ordering only draws the next free slot.
3. See the final section of this file for the numbers and what the last pass changed.
