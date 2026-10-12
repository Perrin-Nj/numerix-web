# Phase log

Evidence per phase, as required by the product prompt (`docs/PRODUCT_PROMPT.md`).

## P0 to P4 (first working slice), 2026-10-12

Docs and product prompt re-read: yes. Entry gate: answered yes from the plan (section 3.1).

Todo (11 steps): review requirements done, inspect docs done, architecture done, plan done, plan reviewed and approved by the owner, implemented, reviewed, tested by running the real app, iterated, checks pass.

| # | Hard-stop item | Evidence |
|---|---|---|
| 1 | Design system complete for planned screens | 40+ components in `src/ui` and `src/game`, each with stories; Storybook builds (`pnpm exec storybook build`) |
| 2 | Components exist in Storybook before use | `pnpm check:stories` passes; ESLint blocks raw Radix in `src/app` and `src/features` |
| 3 | Visible, actionable errors | `scripts/smoke-errors.mjs`: wrong password, network, 500, 429, daily limit, fallback narration, slow narration all show a message with a way forward |
| 4 | No silent failures | `no-empty` lint rule; global query and mutation error handlers; `ErrorBridge` queues errors until the notification center mounts |
| 5 | Onboarding for first-time users | Guided tour on the child home feed (persists after close); parent setup flow: register, add child, consent |
| 6 | Sound planned and packaged locally | `public/sounds` (9 events, webm and mp3, 64 KB), `LICENSES.md`, `pnpm check:sounds` |
| 7 | Defaults to device language | `scripts/smoke.mjs` run with `fr-CA` and `en-CA` contexts; locale negotiated in `src/proxy.ts` |
| 8 | Motion for completion, warning, progress | Outcome beats, reward bursts, chapter complete with confetti, journey nodes; reduced motion switches durations to zero |
| 9 | No AI-like wording, no em dashes | `pnpm check:copy` passes |
| 10 | Engine boundary respected | Beat payloads never carry the answer; the correct answer is only used after the answer response (and never shown for non-correct outcomes) |
| 11 | Theme, PWA, responsive | 3 themes in tokens; manifest, service worker, offline page verified in a production build; phone and TV scale in Storybook |
| 12 | Not rushed | Failures found by running the app were fixed before moving on (see git history) |

Open debt:
- World photos, mascot art and avatars are placeholders (emoji and gradients).
- The 8 BKT parameters and the mock texts are guesses.
- Deployed mock backend host is pending (Vercel cannot run WireMock).
- No unit tests by owner decision; verification is Storybook plus the smoke scripts.
- The Storybook story tests (`@storybook/addon-vitest`) were not run.

Decision: GO for playtest preparation once the hosted mock exists.
