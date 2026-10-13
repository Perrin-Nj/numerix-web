# domain

Pure TypeScript. No React, no `fetch`, no `zustand`; it runs in the browser and in node (`scripts/state-checks.mjs`). `scripts/check-architecture.mjs` bans framework imports here.

`game/` holds the rules: `catalog.ts` (worlds, skills, challenges, welcome card), `events.ts` (the event log vocabulary), `rules.ts` (pass threshold, steps ready ahead), `selectors.ts` (every derived number: map, streak, cards, challenges, reports, reminders inputs), `types.ts`, `clock.ts`.
