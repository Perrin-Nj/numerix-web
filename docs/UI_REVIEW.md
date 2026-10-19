# UI review and polish pass

Scope: global tokens, shared `src/ui`, parent area, auth, profile picker, nav shells, empty, error and loading states. Play question screens, world art and the mascot belong to other agents and are listed under limits.

## 1. Research

What each source gave us, and what we did with it.

| Source | Takeaway used |
| --- | --- |
| [Google, Designing engaging apps for kids](https://developers.google.com/building-for-kids/designing-engaging-apps) | Large touch targets, simple gestures, familiar controls, icon plus label. Kept 44px minimum (48px for primary actions), no double-tap or pinch. |
| [Anthony et al., children and touch targets (2013)](https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf) | Children miss small targets and tap where the last target was. Primary buttons get a 3 to 4px ledge and bigger hit areas, and the password toggle is 48px. |
| [Soni et al., IDC 2019, children and touchscreens](https://init.cise.ufl.edu/wp-content/uploads/sites/775/2019/06/soni-et-al-idc2019-talk.pdf) | Fewer, bigger, well spaced targets. Picker tiles are 192px tall with a full-tile hit area. |
| [Ungrammary, UX tips for kids apps](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps) | Rounded shapes, bright but calm colour, immediate feedback. Radius ramp up to 28px, brand gradient on primary only. |
| [Au Fait UX, young users](https://www.aufaitux.com/specialization/ux-design-for-kids-apps/) | Consistency and restraint beat decoration. One motion language, one elevation language. |
| [Duolingo style guide, third party analysis](https://www.webdesignhot.com/design.md/duolingo/) and [3D press button write-up](https://aiskill.market/skills/duolingo-design-system) | Hard bottom "ledge" shadow, button sinks into it on press, slight overshoot easing. Applied to every filled button, our own colours and our own ledge depth. |
| [Pie CSS design tokens cookbook](https://cdn.jsdelivr.net/npm/@justeattakeaway/pie-css@1.2.0/docs/design-tokens-cookbook.md) | Tokens by role (surface, text, state), not by hue. Added `*-soft`, `*-strong` and `border-input` roles per theme. |
| [web.dev, View Transitions for SPAs](https://web.dev/learn/css/view-transitions-spas) | Use the API where present, keep a fallback, give reduced motion a calm alternative. Routes now use React `ViewTransition`, CSS fade fallback, none under reduced motion. |
| [Smashing Magazine, dyslexia friendly mode](https://smashingmagazine.com/2021/11/dyslexia-friendly-mode-website) | Sans serif, 16px or more, generous spacing, no italics or all caps, bold for emphasis, off white background. Atkinson Hyperlegible stays, the page background stays warm cream, `text-wrap: pretty` avoids lone words. |
| [Dyslexia Scotland, formats](https://dyslexiascotland.org.uk/wp-content/uploads/2025/10/formats.pdf) | Tinted background beats stark white, 4.5:1 text contrast. All tints checked with the AA pairs in section 4. |
| [Smashing Magazine, empty states and onboarding](https://smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps) and [UX Planet, empty state design](https://uxplanet.org/everything-you-need-to-know-about-empty-state-design-af05bee42429) | An empty state needs a reason and a next step. New `EmptyState` takes icon, title, hint, action. |
| [Brilliant, parent progress dashboards](https://brilliant.org/help/features/parent-progress-dashboards-on-brilliant/) and [Matific parent zone](https://help.matific.com/hc/en-us/articles/16659122233105) | Child identity at the top, progress as a few clear numbers with before and after, status in plain words. New child header and `StatTile` with comparison bars. |
| [Material motion, duration and easing](https://m1.material.io/motion/duration-easing.html) | Short for small things (120 to 200ms), longer for large (320ms), never so slow that people wait. Matches `--dur-1..4`. |

## 2. Audit (before)

Screenshots at 360, 768 and 1280 widths of every page: landing, parent login and register, parent home, child overview, report, settings, consent, new child, account, subscription, profile picker, kid home, feed, worlds, journey, collection, challenges, me, 404.

1. Buttons: primary had a ledge, secondary, ghost and danger were flat. On hover the shared `.lift` replaced the ledge shadow with a blur, so a hovered button lost its depth.
2. Cards and panels: flat white boxes, 1px border, identical weight for every section, no icons, hard to scan.
3. Parent home: child facts were three loose lines of text, consent and code status only differed by a text colour, content column was a narrow 768px on a 1280px screen.
4. Child overview: stat tiles were zeros on beige with no icon, no change indicator, no visual comparison. Challenges were bare rows. Nobody knew who the page was about.
5. Empty states: single grey sentences (no sessions, no stuck points, no cards, no profiles) with no next step.
6. Header: at 360px the title was cut to "Nouvel e..." and "Gérer l'ab..." because four icons crowd it.
7. Auth: bare form, no brand, no password reveal, input borders about 1.5:1 against the card (below the 3:1 non-text contrast rule).
8. Landing: plain background, two doors floating without a container.
9. Profile picker: tiles looked like list rows, "Qui joue aujourd'hui ?" left a lone "?" on its own line.
10. Settings: long unbroken stack of switches, Save button at the very bottom of a long phone page, destructive section looked like any other.
11. Route changes: 200ms fade only, same on every browser.
12. Skeletons: flat rectangles unrelated to the card radius.
13. 404 and error headings showed a heavy focus ring after programmatic focus.
14. Bottom nav: hard edge, flat active state.

## 3. What changed

Tokens (`src/styles/tokens.css`, `src/app/globals.css`):
- Radius ramp gains `--radius-xl`. Type roles `--text-meta..--text-display` (fluid at the top). Spacing stays on the Tailwind 4px grid with `--space-card` and `--space-section` for the two common gaps.
- Colour roles per theme (light, dark, high contrast, system dark): `brand-strong`, `brand-grad`, `success-soft`, `warning-soft`, `danger-soft`, `info-soft`, `border-strong`, `border-input`, `page-glow`, press ledges for neutral and danger, inset highlight.
- Soft page glow behind the content, `text-wrap: pretty` on text and `balance` on headings, no focus ring on programmatic heading focus.

Components (`src/ui`, each with a story):
- `Button`: tactile ledge on primary, secondary and danger, sinks 3 to 4px on press, subtle lift on hover, gradient on primary, no layout shift.
- `Card`, `Panel`: 2px border, layered shadow, inset highlight, brand tone gradient. `Panel` gets an optional `icon`.
- New `StatTile` (number, icon, signed change chip, before and after bars that grow in once), `EmptyState`, `Chip`.
- `AppHeader` blurred and shadowed, two line title clamp, tighter icon gap on phones. `BottomNav` rounded with blur and an underline on the active tab. `Input`, `Select`, `PinInput` and `Switch` use the 3:1 border. `PageTransition` uses React `ViewTransition`.

Screens:
- Parent home: wide frame, three column cards with a brand stripe, status chips with icon and text, tactile actions, empty state with an add button.
- Child overview: identity header with avatar and shortcuts, growth tiles with comparison bars, challenge rows with chips and progress, empty states for sessions and stuck points.
- Report, settings (panel icons, divided switches, sticky Save on phones, danger tinted data section), account, security (device rows as cards, "this device" chip).
- Login and register: brand mark, tagline, password reveal toggle (48px), soft elevated card.
- Landing: floating blobs and sparkles (off under reduced motion), doors inside one elevated dock.
- Profile picker: tall tactile tiles, code chip with lock icon, icons on the grown-up actions, empty state with a way out.
- Collection: `EmptyState` with a "Choisir un monde" / "Pick a world" action. New message keys exist in fr-CA and en-CA.

## 4. Iterations

1. Pass 1 screenshots: tiles showed two empty bars when both numbers were zero (hidden now), parent home and overview used the narrow frame (now wide), settings Save was buried (sticky), header still truncated (clamped to two lines and icon gap reduced).
2. Pass 2 screenshots in light, dark and high contrast: input borders failed 3:1 in dark (new `border-input` token, 3.6:1 light, 4.2:1 dark, white in high contrast), challenge titles wrapped one word per line at 360 (chip now wraps under the title), lone "?" in the picker bubble (global `text-wrap: pretty`).
3. View transitions checked in Chromium: `startViewTransition` is called once per navigation, the fixed bottom nav stays fixed.

Contrast pairs checked by hand on the new tints: `success` on `success-soft` 4.9:1, `warning` on `warning-soft` 5.6:1, `info` on `info-soft` 5.1:1 in light. Dark and high contrast tints are darker surfaces with the existing light text colours, 7:1 or better.

## 5. Limits

- The speech bubble squeeze on the landing page and kid home at 360px comes from the mascot size and is in the mascot agent's files.
- Play question screens, beats, world art and the admin question editor were not touched.
- Admin app (`admin/`): same tactile buttons, 2px cards with shadow, 44px nav and inputs, soft page glow, AA success and info colours. Question editor untouched.
- Stat tiles show change versus the previous window only, no history chart, because the API returns two windows, not a series.
