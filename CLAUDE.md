# Numerix web: instructions for coding agents

1. Read `docs/PRODUCT_PROMPT.md` first, every session and every phase. It is the guiding document for all work here.
2. Then read the sections of `docs/frontend-spec.md` and `IMPLEMENTATION_PLAN.md` for the current phase.
3. Follow the entry gate and exit gate of the plan. Record evidence in `PHASE_LOG.md`.
4. Storybook first: no component is used in the app unless it exists in Storybook.
5. Config first: environment-dependent values go through `config/`, never `process.env` in components.
6. Any backend need goes into `contracts/` (openapi, BACKEND_REQUIREMENTS.md, WireMock mapping, fixture) in the same pull request.
7. No silent errors, no em dashes or AI-sounding copy in the product.
8. Token saving: terse replies, `rtk` prefix on shell commands, one read per file.
9. No AI attribution: never add Co-Authored-By or "Generated with" lines to commits or pull requests.
