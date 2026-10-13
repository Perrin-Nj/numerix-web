# data/api

- `client.ts`: `api` (openapi-fetch), `unwrap`, `ApiError` with a stable `code`, `newIdempotencyKey`, mode header (`parent` or `child`), connection problem classification.
- `schema.d.ts`: generated. Never edit. Regenerate with `pnpm gen:api`.
- `types.ts`: friendly aliases over the generated schema.
- `platform-types.ts`: subscription, plan, notification and platform config types.
- `narration.ts`: Server-Sent Events reader for scene and denouement text.

Contract: `contracts/BACKEND_INTEGRATION.md`. `scripts/api-inventory.mjs` fails when a call here has no operation in `contracts/openapi.yaml`.
