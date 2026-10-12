# Numerix web

Next.js PWA for Numerix: children play math through stories, parents follow progress.

- Product prompt (guiding document): `docs/PRODUCT_PROMPT.md`
- Specification: `docs/frontend-spec.md`; component contract: `docs/component-api.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`; evidence log: `PHASE_LOG.md`; decisions: `adr/`
- API contract, backend requirements and mock: `contracts/`

## Run it locally

```bash
pnpm install
pnpm mock        # WireMock on :8080 (Docker), driven by contracts/
pnpm dev         # app on :3000, uses .env.local (copy .env.example)
pnpm storybook   # component library on :6006
```

Walk through the real app (needs `pnpm dev` and `pnpm mock` running, Playwright browsers installed):

```bash
pnpm smoke            # parent signup flow, PIN, three-beat chapter, rewards, collection
pnpm smoke:errors     # every failure scenario shows a visible message
```

Try the failure scenarios by hand with the "Demo data" badge at the bottom left.

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
