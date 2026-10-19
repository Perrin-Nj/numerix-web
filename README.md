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

The kid app needs the question bank to show quests and play real questions. Load it once into the development database (Go installed, from `../numerix-api`):

```bash
go run ./cmd/seed --db data/dev.db --exclude _examples     # 20 worlds, 89 quests, 1229 questions, 193 assets
```

The admin app (`admin/`, port 3100) runs with `cd admin && npm install && npm run dev`; it needs `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_TOKEN` and `PLATFORM_API_URL` (see `admin/README.md`).

`pnpm dev` reuses a Go API that is already running on :8081 and otherwise builds and starts `../numerix-api/bin/api.exe` on `data/dev.db`. Demo parent: `demo@numerix.dev` / `correct-horse-battery`, child PINs `1234` and `4321` (created through the real endpoints by `scripts/seed-dev.mjs`, development only).



Automated checks, one line each (`bash scripts/test.sh` runs them all):

```bash
bash scripts/test.sh state    # pure game-state selectors, instant
bash scripts/test.sh flows    # HTTP flows through the app
bash scripts/test.sh ui       # browser checks (needs Playwright browsers installed)
bash scripts/test.sh live     # flows and ui against the deployed app
bash scripts/test.sh contract # openapi vs frontend calls vs backend guide (no servers)
bash scripts/test.sh arch     # layer arrows and documentation coverage
SEED_CONTENT=1 bash scripts/test.sh play   # world map, journeys, every question kind on the seeded bank
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

Vercel team `numerix`, project `numerix-web`. `vercel deploy --prod` publishes to the free `*.vercel.app` domain. The Go API runs on an Oracle Cloud Always Free VM: set `API_URL` in `config/env/*.env`. Steps, content seeding and the pre-merge list are in `docs/DEPLOY.md` and `../numerix-api/docs/RELEASE_CHECKLIST.md`.
