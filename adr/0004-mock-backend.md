# ADR 0004: WireMock as the mock backend

Status: Superseded by the Go API (`../numerix-api`). The mock and WireMock were removed; the Go server is the reference. Kept as history.

The `contracts/` folder drives the mock: `openapi.yaml` is the contract, `wiremock/gen.mjs` generates the mappings, WireMock serves them with scenarios for the chapter loop and `X-Mock-Scenario` for failure injection. Locally and in CI it runs in Docker (`pnpm mock`). WireMock needs a JVM or Docker host, so deployed environments point `API_URL` at a hosted container (see `render.yaml` and `contracts/wiremock/Dockerfile`).
