# ADR 0004: WireMock as the mock backend

Status: superseded. The mock and WireMock were removed when the app moved to the Go API (`../numerix-api`, branch `chore/go-backend-cutover`). Kept as history.

Status: accepted (owner decision).

The `contracts/` folder drives the mock: `openapi.yaml` is the contract, `wiremock/gen.mjs` generates the mappings, WireMock serves them with scenarios for the chapter loop and `X-Mock-Scenario` for failure injection. Locally and in CI it runs in Docker (`pnpm mock`). WireMock needs a JVM or Docker host, so deployed environments point `API_URL` at a hosted container (see `render.yaml` and `contracts/wiremock/Dockerfile`).
