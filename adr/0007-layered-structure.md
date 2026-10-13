# ADR-0007: layered structure and the data gateway

Status: accepted, 2026-10-13.

## Context

`src/lib` mixed pure rules, browser services, HTTP and state; `features/api/hooks.ts` held 389 lines of unrelated hooks and the local-versus-server switch. Moving a concern meant searching the whole tree, and nothing stopped a UI primitive from importing a screen.

## Decision

Ten layers with inward-only arrows (app, features, game, ui, data, domain, platform, shared, config, i18n), documented in `docs/ARCHITECTURE.md` and enforced by `scripts/check-architecture.mjs` (CI via `scripts/test.sh arch`). Pure rules live in `domain/` and run in node. `data/` owns HTTP, hooks (one file per concern) and the on-device event store; the `STATE_SOURCE` switch lives in `data/hooks/state.ts` only. Every folder has a README and every export in the logic layers has a doc comment (`scripts/check-docs.mjs`).

## Consequences

- Screens import `@/data/hooks`, never `fetch`, and never reach into `platform` internals of another concern.
- A real backend replaces the local adapter without touching screens.
- A new layer or a new exception must be added to the checker and the architecture page in the same change.
- Moves were mechanical (`git mv` plus path rewrite), so history is preserved.
