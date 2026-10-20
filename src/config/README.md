# config

`env.ts` validates the public environment variables by hand (no zod in the browser bundle) and `server-env.ts` validates the server ones with zod. `app.ts` exposes `appConfig` (feature flags, state source, card threshold, locales, mascot). Nothing else reads `process.env`. Variables are listed in `.env.example` and `config/env/*.env`.
