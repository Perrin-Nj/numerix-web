# platform

Browser capabilities behind hooks, so screens and stories can swap them: `audio` (sound pools, toggles), `speech` (voice choice per language, spoken text, queue until the first tap), `theme`, `motion` (reduced motion, count up), `prefs` (voice, hints, delay, volume, vibration), `errors` (report bridge), `format`, `lines` (pools of mascot lines, no repeats), `coach` (idle hints), `music` (calm loops: starts after the first tap, ducks under voice, pauses when hidden).

Rules: no screen knowledge, no fetch. May use types from `data/api` (see exceptions in `docs/ARCHITECTURE.md`).
