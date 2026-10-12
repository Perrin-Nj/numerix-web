# Architecture

Numerix web is a Next.js app with a layered structure. Dependencies point inward only; `scripts/check-architecture.mjs` reads every import and fails when a layer reaches where it must not. This page is the map. Each folder under `src/` also has its own `README.md` with its public API and rules.

## Layers

```
app/        routes, layouts, route handlers (thin: compose a feature, nothing else)
features/   screens and flows for the kid app and the parent area
game/       kid-app widgets (story panel, cards, journey, rewards ...)
ui/         design-system primitives (button, dialog, input ... no app knowledge)
data/       how the app talks to the world: HTTP client, gateway, query hooks, local event store
domain/     pure rules, types, catalog, selectors (no React, no fetch, runs in node)
platform/   browser services: audio, speech, notifications, theme, motion, prefs, errors
shared/     tiny helpers used everywhere (class names)
config/     validated environment (zod)
i18n/       locale negotiation and generated message bundles
```

Arrows (a layer may import the layers on its row, never the reverse):

| layer | may import |
|-------|-----------|
| app | features, game, ui, data, domain, platform, shared, config, i18n |
| features | game, ui, data, domain, platform, shared, config, i18n |
| game | ui, domain, platform, shared, config, i18n |
| ui | platform, shared, config, i18n |
| data | domain, platform, shared, config |
| domain | shared |
| platform | domain, shared, config |
| shared | nothing |

Documented exceptions (types only, listed in `check-architecture.mjs`): `game`, `ui` and `platform` may import `data/api/types` and `data/api/platform-types` (entities typed from the contract), and `ui` may read `data/api/client` to classify an `ApiError` in the error screen.

Rules that follow from the arrows:

1. `ui` knows nothing about Numerix. A Button works in any app. Radix is imported only here.
2. `game` composes `ui` into kid-app widgets. Every widget has a Storybook story (dark, high contrast, reduced motion, TV, fr, en). Screens use only `ui` and `game` components (`scripts/check-stories.mjs`, ESLint `no-restricted-imports`).
3. `domain` is pure. It is imported by the browser, by node scripts (`scripts/state-checks.mjs`) and could be shared with a server. No `react`, `next`, `zustand` or `@tanstack`.
4. `data` is the only place that knows URLs, cookies, problem codes and the local event log. Screens call hooks, never `fetch`.
5. `platform` wraps browser capabilities behind hooks so screens and stories can swap them (a null audio player in Storybook, a fake speech engine in tests).
6. `features` hold the flows. They may call `data` hooks, read `domain` selectors, and render `game` and `ui`.

## Data flow

Kid answers a question:

```
ChoiceButton (game) --onSelect--> StoryScreen (features)
  StoryScreen --answerBeat()--> data/hooks/sessions --HTTP--> /api/v1 proxy --> backend (or mock)
  backend --Answer{outcome, rewards, session.score}--> StoryScreen
  StoryScreen --append(event)--> data/local/store (zustand, persisted, keyed by child)
  screens read derived state:  domain/game/selectors(events)  ->  data/hooks/progress  ->  Home, Journey, Cards, Me, Report
```

Two state sources, one switch (`NEXT_PUBLIC_STATE_SOURCE`):

- `local` (default for the demo): the on-device event log is the source of truth; `domain/game/selectors` derive the map, streak, cards, challenges and reports. The server only grades answers and tells the story.
- `api`: the same hooks call the server endpoints instead (BE-21). Screens do not change, because they use `data/hooks/*`, which choose the adapter once, in `data/gateway.ts`.

Subscription and platform data are server-owned in both modes (`data/hooks/platform`).

## The API boundary

- The browser only calls the same-origin proxy `app/api/v1/[...path]/route.ts`. It moves tokens into httpOnly cookies, forwards locale and idempotency headers, rejects cross-origin writes, and (in demo mode) forwards mock helper headers.
- Errors are `application/problem+json`. `data/api/client.ts` turns every failure into an `ApiError` with a stable `code`; `platform/errors` maps codes to kind messages; `ui/error-screen` and `ui/screen-state` make sure no failure leaves a screen idle.
- Everything the backend must provide is in `contracts/BACKEND_INTEGRATION.md`, checked by `scripts/api-inventory.mjs`.

## Cross-cutting

- **i18n:** `next-intl`, locale in the `NEXT_LOCALE` cookie. Messages live next to the component (`messages.fr-CA.json`, `messages.en-CA.json`), merged by `pnpm gen:messages`. Spoken language always equals app language (`platform/speech`).
- **Themes:** light, dark, high contrast, set on `<html>` by `platform/theme`. Colour tokens in `app/globals.css`.
- **Motion and sound:** `platform/motion` (reduced motion hook), `platform/audio` (sound pools, toggles). Every animation has a reduced-motion variant.
- **Config first:** nothing reads `process.env` outside `config/`.
- **No silent errors:** every failure shows what happened and a way out (retry, back, home).

## Testing

| What | How |
|------|-----|
| Pure rules | `scripts/state-checks.mjs`, `check-spoken`, `check-voices`, `check-coach`, `check-scene-layout`, `check-card-styles` (node, instant) |
| Architecture | `scripts/check-architecture.mjs` |
| Contract | `scripts/api-inventory.mjs` |
| HTTP flows | `scripts/flows.mjs` |
| Browser | `scripts/ui-checks.mjs`, `ui-error-checks.mjs`, `mobile-audit.mjs` |
| Components | Storybook (`pnpm storybook`), `check:stories` |
| All | `bash scripts/test.sh` |

## Decisions

- ADR-0007: layered structure and the gateway split (this page).
- Older decisions are in `adr/`.
