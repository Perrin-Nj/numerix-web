# config

`env.ts` validates every environment variable with zod (public and server). `app.ts` exposes `appConfig` (feature flags, state source, card threshold, locales, mascot). Nothing else reads `process.env`. Variables are listed in `.env.example` and `config/env/*.env`.
