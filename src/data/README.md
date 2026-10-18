# data

Everything about getting and keeping data.

- `api/`: typed HTTP client (`client.ts`), generated schema (`schema.d.ts`, from `contracts/openapi.yaml` with `pnpm gen:api`), aliases (`types.ts`), platform types, narration streaming.
- `hooks/`: query hooks, one file per concern, public API through `index.ts` (`@/data/hooks`).

- `local/`: the remembered kid profile (first name and avatar) on this device.
- `session/`: cleanup on sign out and the query-client registry.

Rules: screens never call `fetch`; they call hooks.
