# app

Next.js App Router. Files here are thin: a `page.tsx` renders one screen from `features/`, a `layout.tsx` wires providers, a `route.ts` is a server handler.

- `api/v1/[...path]/route.ts`: the same-origin proxy to the backend.
- `api/session/route.ts`: tells the client which sessions exist (cookies are httpOnly) and signs out.
- `api/health/route.ts`: app and backend health for probes.
- `providers.tsx`: query client, theme, audio, notifications, error bridge.
- `error.tsx`, `global-error.tsx`, `not-found.tsx` (also under `play/` and `parent/`): no failure leaves a screen idle.

Rules: no business logic, no `fetch`, no `process.env` (use `config/`).
