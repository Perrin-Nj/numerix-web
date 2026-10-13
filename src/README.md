# src

Layers, from the outside in. See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the arrows, the data flow and the rules. `node scripts/check-architecture.mjs` fails when an import breaks them.

| folder | what lives there |
|--------|------------------|
| `app/` | Next.js routes, layouts, route handlers (thin) |
| `features/` | Screens and flows: kid app (`play`), parent area (`parent`), auth, shared shells, notifications |
| `game/` | Kid-app widgets and the error screens (each has Storybook stories) |
| `ui/` | Design-system primitives, no app knowledge |
| `data/` | HTTP client, query hooks, on-device event store, sign-out cleanup |
| `domain/` | Pure game rules, catalog and selectors (no React, runs in node) |
| `platform/` | Browser services: audio, speech, theme, motion, prefs, errors, lines, coach |
| `shared/` | Tiny helpers (`cn`) |
| `config/` | Validated environment (zod) |
| `i18n/` | Locale negotiation and generated message bundles |
| `proxy.ts` | Locale cookie and route guards (runs before every request) |
