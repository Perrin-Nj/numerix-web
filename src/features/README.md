# features

Screens and flows. A feature composes `game` and `ui` components, reads state through `data/hooks`, and uses `domain` selectors for rules.

- `play/`: the kid app (home, worlds, journey, story, done, quest, challenges, collection, me, feed, picker).
- `parent/`: parent area (home, child form, consent, overview, settings, recap, report, subscription).
- `auth/`: login and register form.
- `common/`: welcome screen, offline banner, parent gate, PWA manager, notification bell and prompt, subscription pill.
- `notify/`: reminder rules, browser notifications, web push subscription.

Rules: screens import UI only from `@/ui` and `@/game` (never Radix). Every failure shows a way out. Text goes through `next-intl`.
