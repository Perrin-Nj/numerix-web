# Backend in Go: questions, how-to pictures, reuse

Status: proposal approved for build. The contract is `contracts/openapi.yaml` (spec first), the rules are in `contracts/BACKEND_REQUIREMENTS.md` (BE-56 to BE-63), the long guide is `contracts/BACKEND_INTEGRATION.md`. The Python engine in `Services/numerix-` is the reference to port: it already holds the generators, the error taxonomy, the leak check and the BKT planner.

## 1. Who does what (the LLM never does math)

| Job | Done by | Why |
|---|---|---|
| Pick the next skill and difficulty | Go planner (port of `planificateur.py` and `bkt.py`) | Deterministic, testable, explainable to parents |
| Generate the question, the choices, the right answer, the typical wrong answer | Go generators (port of `gen_*.py`) | A child must never get a wrong "right answer" |
| Grade the answer, name the mistake (`erreur_typique` code) | Go engine | Same reason |
| Build the how-to picture (`MethodVisual`) | Go visual builder, from the same numbers | Exact by construction, cacheable, no image model needed |
| Write the story scene (before the answer) | LLM, context without the answer | Structural leak protection (phase 1 payload) |
| Write the story ending (after the answer) | LLM, given the verdict | Dresses a conclusion, never produces one (phase 2 payload) |
| Check the narration for leaks and symbols | Go leak detector (`fuite_detectee`) | Every LLM text is checked before it is served or cached |

The LLM receives the two payloads described in the engine README (`pour_le_llm_mise_en_scene`, `pour_le_llm_denouement`). It never receives the correct answer in phase 1, and it is never asked for a number, a choice or a picture. If the provider is down or over budget, a canned bank per world and language answers (BE-54), so play never blocks.

## 2. Graphics: data, not pictures

The backend does not draw. It answers with a small declarative object, `MethodVisual { kind, params, steps[], alt, cache_key }`, and the web app animates it in SVG (`src/game/method-visual`). Reasons:

- A few hundred bytes instead of an image, so it travels and caches well and works offline once played.
- Themes (light, dark, high contrast), reduced motion, French and English, text size and TV mode all come for free on the client.
- Exact: the same engine numbers produce the picture and the answer.
- The method follows the concrete, pictorial, abstract sequence that primary schools use for regrouping: base-ten blocks first, then number line and bar models, then written method. Kinds today: `add_carry`, `sub_borrow`, `equal_groups`, `equal_share`. Next kinds (additive only, old clients ignore unknown kinds): `number_line_jump`, `bar_model`, `ten_frame`, `fraction_bar`, `array`.

Server-side SVG is only needed for non-interactive output (PDF progress report, email). For that, use `github.com/ajstarks/svgo` (small, writes SVG to any `io.Writer`) or `github.com/tdewolff/canvas` (SVG, PDF and raster from one drawing API). Both are optional and off the critical path.

## 3. Question bank and reuse

Goal: generate once, serve many times, never repeat a question to the same child.

Tables (PostgreSQL):

```
question            id uuid pk, skill_id, grade, difficulty, shape text, params jsonb,
                    params_hash text UNIQUE, math_fr, math_en, choices jsonb,
                    correct jsonb, typical jsonb, generator_version, created_at, served_count int
question_visual     cache_key text pk, kind, params jsonb, lang, steps jsonb, alt, created_at
narration           id, question_id, world, lang, phase (scene|denouement), outcome null,
                    prompt_version, text, leak_checked bool, created_at,
                    UNIQUE (question_id, world, lang, phase, outcome, prompt_version, variant)
child_question      child_id, question_id, served_at, outcome, PRIMARY KEY (child_id, question_id)
```

`params_hash` is a hash of (skill_id, generator_version, normalized params). `shape` is a coarse label of the problem form (for example `add:2+2:carry`, `add:3+2:carry`, `sub:2-1:borrow`) so two consecutive beats never share a shape.

Selection for a child, a skill and a difficulty (one transaction):

1. Candidates = `question` rows of that skill and difficulty that the child has never been served (`NOT EXISTS` in `child_question`), whose `shape` differs from the previous beat of the session, ordered by lowest `served_count`, then random. Take one with `FOR UPDATE SKIP LOCKED`.
2. If there is none, generate a new one with the engine (seeded, deterministic), `INSERT ... ON CONFLICT (params_hash) DO NOTHING`, and loop once. A conflict means another request just created it, which is fine: the child gets it.
3. Insert `child_question`, increment `served_count`, return the beat. The correct answer stays in the database row and never leaves the server before the answer is graded.
4. After a wrong answer the next beat follows the same rule, plus a different `shape`, so "Continue" never replays the same kind of sum. If the bank is empty for the shape, generate.

The how-to picture is built when the answer is graded: look up `question_visual` by `cache_key` (kind, params, language), build it on a miss, return it in `AnswerResult.method_visual` for right and wrong answers alike. Narration follows the same idea: the scene text for (question, world, language, prompt version) is generated once per variant, leak-checked, stored, and reused by other children. Keep 2 to 3 variants per key so a classroom does not read the same sentence.

Privacy: the bank holds no personal data. `child_question` is personal data (Law 25): purge with the child (BE-36, BE-41).

## 4. Stack

| Concern | Choice |
|---|---|
| HTTP | `net/http` with `chi` |
| Contract | spec first: `oapi-codegen` (module `github.com/oapi-codegen/oapi-codegen/v2`) generates server stubs and models from `contracts/openapi.yaml`; CI fails if generated code drifts (BE-49) |
| Database | PostgreSQL, `pgx`, typed queries with `sqlc`, migrations with `goose` or `golang-migrate` |
| Cache and rate limits | Redis (Upstash works through REST for the mock; use a real Redis in production) |
| Jobs | purge, BKT recompute, bank warm-up (`river` on Postgres, or a plain worker) |
| Observability | `slog`, OpenTelemetry traces, `X-Request-Id` and `traceparent` (BE-47) |
| LLM | one provider interface with failover and a daily cost cap (BE-54) |

Suggested layout, matching the web app's layered rule (inward imports only):

```
backend/
  cmd/api/                 main, wiring
  internal/http/           generated handlers + adapters (outermost)
  internal/app/            use cases: StartSession, NextBeat, Answer, Summary
  internal/engine/         generators, grading, error taxonomy, leak check, planner, BKT (pure, no I/O)
  internal/visual/         MethodVisual builders (pure)
  internal/store/          sqlc queries, question bank, history
  internal/narrator/       LLM client, payloads, cache, fallback bank
  api/                     generated from contracts/openapi.yaml
```

`engine` and `visual` import nothing from the rest. Port the Python tests first (720 leak checks, generator properties) and keep them as table tests.

## 5. What the web app now expects (new in this round)

- `AnswerResult.method_visual` (optional). Sent for right and wrong answers, in the request language. Absent when no picture exists for the skill.
- The web app no longer shows the written carry hint. The picture carries the lesson.
- Consecutive beats of one chapter must differ in shape (see section 3).
- Environment switches on the web app, all off by default: `NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI` (trial badge, subscription card and links), `NEXT_PUBLIC_FEATURE_WELCOME_GIFT` (the first-visit gift only; other gifts and cards stay), `NEXT_PUBLIC_SHOW_DEMO_BADGE` (demo data badge). They only hide UI. The server still enforces the subscription gate (402 and 403). While billing is off, set the platform `unpaid_policy` to `allow` or parents will be blocked by a rule they cannot see.

## 6. Integration readiness checklist

- [x] Contract: `MethodVisual` schema and `AnswerResult.method_visual` in `openapi.yaml`, types regenerated.
- [x] Mock returns `method_visual` (`mock/lib/visual.mjs`) and varies the shape of addition and subtraction per beat.
- [x] Web: `MethodVisual` component with stories, wired into the outcome stage.
- [ ] Go: scaffold `backend/` from the spec with `oapi-codegen`; port engine and tests.
- [ ] Go: question bank, history and selection (section 3).
- [ ] Go: visual builder with the four kinds and golden tests against `mock/lib/visual.mjs` output.
- [ ] Go: narrator with leak detector, cache and fallback bank.
- [ ] Switch a staging environment to `NEXT_PUBLIC_STATE_SOURCE=api` and run `bash scripts/test.sh` against it.
