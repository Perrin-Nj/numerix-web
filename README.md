# Numerix web

Next.js PWA for Numerix: children play math through stories, parents follow progress.

- Product prompt (guiding document): `docs/PRODUCT_PROMPT.md`
- Specification: `docs/frontend-spec.md`; component contract: `docs/component-api.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`; evidence log: `PHASE_LOG.md`; decisions: `adr/`
- API contract, backend requirements and mock: `contracts/`

## Run it locally

```bash
pnpm install
pnpm dev         # starts the mock backend (:8081) and the app (:3000) together; copy .env.example to .env.local first
pnpm storybook   # component library on :6006
```

`pnpm dev` reuses a mock that is already running. `pnpm mock` starts only the mock; `pnpm mock:wiremock` runs the pure WireMock engine in Docker (static contract only).

Progress state: `NEXT_PUBLIC_STATE_SOURCE=local` (default) derives the world map, streak, cards, challenges and reports from an on-device event log; `api` makes the server own them (BE-21). The log lives in the browser's localStorage, keyed by child.

Automated checks, one line each (`bash scripts/test.sh` runs them all):

```bash
bash scripts/test.sh state    # pure game-state selectors, instant
bash scripts/test.sh mock     # mock backend self test
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

Every backend need goes into `contracts/` in the same pull request: `openapi.yaml`, `BACKEND_REQUIREMENTS.md`, the WireMock generator `wiremock/gen.mjs` (then `node contracts/wiremock/gen.mjs`), and `pnpm gen:api`.

## Deploy

Vercel team `numerix`, project `numerix-web`. `vercel deploy --prod` publishes to the free `*.vercel.app` domain. WireMock cannot run on Vercel: host the container from `contracts/wiremock/Dockerfile` (see `render.yaml`) and set `API_URL` in `config/env/*.env`.
