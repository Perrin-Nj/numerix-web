# Backend requirements (owned by the frontend work)

Single list of everything the frontend needs from the backend. `openapi.yaml` is the machine-readable contract; this file explains the why and tracks status. Update it in the same pull request as the frontend change that creates the need (see `docs/frontend-spec.md` section 22.6).

Status values: `proposed` (not in `openapi.yaml` yet), `in-contract` (in `openapi.yaml`, not built), `built`, `verified` (checked against the live backend).

## Rules the backend must honor

| ID | Requirement | Why (screen or rule) | Status |
|---|---|---|---|
| BE-01 | A `Beat` response never contains the correct answer; it appears only in the `AnswerResult`. Same for cached, logged and streamed data. | Engine boundary (docs: the model never does math) | in-contract |
| BE-02 | `Idempotency-Key` on `startSession`, `nextBeat`, `answerBeat`: a retry with the same key returns the stored first result. | Network drops on the story screen | in-contract |
| BE-03 | Errors use `application/problem+json` with a stable `code` from the vocabulary below. | Visible, actionable errors | proposed (CR-5) |
| BE-04 | Narration stream is `text/event-stream`. Events: `scene` and `denouement` with `data: {"delta":"..."}`; `done` with `data: {}`; `fallback` with `data: {"text":"..."}`. Reconnect with `Last-Event-ID` resumes. | Streaming story text | proposed |
| BE-05 | The narrator result is checked with `fuite_detectee()`-style leak detection before it is returned. | Engine boundary | proposed |

### `Problem.code` vocabulary

`consent_missing`, `daily_limit_reached`, `session_active`, `session_paused`, `session_completed`, `beat_answered`, `invalid_pin`, `unauthorized`, `forbidden`, `not_found`, `validation_failed`, `rate_limited`, `internal_error`.

## Change requests

| ID | Change | Why | Status |
|---|---|---|---|
| CR-1 | Honor `Accept-Language` (fr-CA, en-CA) on catalog, journey and narration; localized world, skill and node titles | Two locales from day one | proposed |
| CR-2 | `onboarding_completed` flags per parent and per child | Persist guided flow across devices | proposed |
| CR-3 | Avatar catalog endpoint | Avoid hardcoded avatars | proposed |
| CR-4 | Add 429 and 5xx responses to every operation | Complete error handling | proposed |
| CR-5 | Define the `Problem.code` vocabulary above in the contract | Stable client error mapping | proposed |
| CR-6 | `fallback` flag on narration (beat and answer result) and in `SessionSummary` | Parent recap marks fallback beats; no silent fallbacks | proposed |
| CR-7 | Parent password re-check endpoint (or documented use of login) | Parent gate to leave child mode | proposed |
| CR-8 | Misconception suggestion text for parents | P-09 suggestion line | proposed |
| CR-9 | Parent web push subscription and reminder preferences | Optional parent reminders | proposed |
| CR-10 | `GET /children/{id}/home` aggregate (suggested chapter, quest, world teasers, recent cards, engagement, growth) | Home feed without request waterfalls | proposed |
| BE-11 | Streak day boundary needs the child's time zone: add `timezone` (IANA) to `Child` | Streak and daily goal in local days | proposed |
| BE-12 | `Session.kind` gains `onboarding` (fixed easy practice problems, not counted in mastery) | Child first-run guide | proposed |
| BE-13 | Image URLs (worlds, cards, avatars) served from a CDN with stable cache headers; the frontend CSP `img-src` allows only that host | Performance and CSP | proposed |
| BE-14 | `GET /health` reports narrator state (`llm`, `stub`, `down`) | Parent area status notice | in-contract |
| BE-15 | Mock-only: `X-Mock-Scenario` header triggers failure and edge scenarios in WireMock. The real backend ignores it. | Failure-injection tests | mock only |

## Mock coverage

Every operation in `openapi.yaml` must have a WireMock mapping in `contracts/wiremock/` and typed fixtures in `contracts/fixtures/`. CI checks both.
