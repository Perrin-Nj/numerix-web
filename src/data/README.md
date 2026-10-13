# data

Everything about getting and keeping data.

- `api/`: typed HTTP client (`client.ts`), generated schema (`schema.d.ts`, from `contracts/openapi.yaml` with `pnpm gen:api`), aliases (`types.ts`), platform types, narration streaming.
- `hooks/`: query hooks, one file per concern, public API through `index.ts` (`@/data/hooks`).
- `local/`: on-device event log (zustand, persisted) and the remembered kid profile.
- `session/`: cleanup on sign out and the query-client registry.

Rules: screens never call `fetch`; they call hooks. `STATE_SOURCE` picks local or server state inside `hooks/state.ts`, nowhere else.
