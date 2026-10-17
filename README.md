# Numerix web

Next.js PWA for Numerix: children play math through stories, parents follow progress.

- Product prompt (guiding document): `docs/PRODUCT_PROMPT.md`
- Specification: `docs/frontend-spec.md`; component contract: `docs/component-api.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`; evidence log: `PHASE_LOG.md`; decisions: `adr/`
- API contract and backend requirements: `contracts/` (the backend itself is `../numerix-api`, Go)

## Run it locally

```bash
pnpm install
pnpm dev         # starts the Go API (:8081, built on first run, demo account seeded) and the app (:3000); copy .env.example to .env.local first
pnpm storybook   # component library on :6006
```

`pnpm dev` reuses a Go API that is already running on :8081 and otherwise builds and starts `../numerix-api/bin/api.exe` on `data/dev.db`. Demo parent: `demo@numerix.dev` / `correct-horse-battery`, child PINs `1234` and `4321` (created through the real endpoints by `scripts/seed-dev.mjs`, development only).

Progress state: `NEXT_PUBLIC_STATE_SOURCE=api` (default) lets the server own the world map, streak, cards and reports (BE-21); `local` derives them from an on-device event log in localStorage.

Automated checks, one line each (`bash scripts/test.sh` runs them all):

```bash
bash scripts/test.sh state    # pure game-state selectors, instant
bash scripts/test.sh flows    # HTTP flows through the app
bash scripts/test.sh ui       # browser checks (needs Playwright browsers installed)
bash scripts/test.sh live     # flows and ui against the deployed app
```

## Checks

```bash
pnpm check   # Storybook-only, copy rules, sounds, typecheck, lint
pnpm build
```

## Configuration

Everything environment dependent goes through `src/config` (zod validated, documented in `.env.example`). Mascot on/off and kind are `NEXT_PUBLIC_MASCOT_*`. Vercel settings are in `vercel.ts`; variables are synced with `pnpm vercel:env diff|push <production|preview>`.

## Backend work

Every backend need goes into `contracts/` in the same pull request: `openapi.yaml`, `BACKEND_REQUIREMENTS.md`, the Go handler in `../numerix-api` (then `scripts/gen.sh` there), and `pnpm gen:api`.

## Deploy

Vercel team `numerix`, project `numerix-web`. `vercel deploy --prod` publishes to the free `*.vercel.app` domain. Host the Go API separately (container) and set `API_URL` in `config/env/*.env`.
