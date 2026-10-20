# QA sign-off

Date: 2026-10-20 (round 3). Candidate: frontend `fix/qa-round2` 3c933b2, numerix-api main 5ea5ff5 (includes b963513 and 5ea5ff5).

NOT SIGNED OFF.

Blocking (details in `docs/QA_REPORT.md`, tests in `docs/REGRESSION_INDEX.md`):
- P0 QA-BE-006 (backend, with A): the home screen's main "Jouer / Continue l'aventure" button starts the skill that `GET /children/{id}/home` suggests (`suggested.skill_id` and `quest.skill_ids`, for a new child `ARI-OPE-A06a`), and BE-004 now refuses it: `422 locked: prerequisites`. The button does nothing, silently. Test: `scripts/qa/extra.mjs` "home suggestion starts". It also turns 11 ui checks, 1 mobile check and the flows chapter check red.
- P1 QA-A-009 (A): the first-run welcome gift is a flat vector gift box on a bare overlay (not photographic, not swept by the visual police because it only shows to a child who has not claimed it). Needs a photo or Numa treatment and a sweep state that captures it.

Re-tested and closed: QA-BE-004 (locked explicit skill_id now 422, 0 of 98 locked nodes start), QA-BE-005 (passkey registers with a virtual authenticator on a non-3000 port), QA-A-008 (84 of 84 runnable strict cases pass; 15 cases were a test bug and are fixed, one m360 science case reports the voice-unavailable toast covering the answers, kept as P2).

Green evidence: go test -count=3 1455 passed; sweep 63 loads, 0 P0, 0 P1; linkcheck 188 checks (every bottom-nav tab and every internal link, 360 and 1280, fr and en) 0 x 404; api-fuzz, feed, errors, contract all pass in the full run; load 50 rps x 30 s: 2 runs, answer p95 2.2 and 2.3 ms, one run had nextBeat p95 810 ms (host under memory pressure, p50 3.6 ms, other run 5.4 ms) so the budget is met in 1 of 2 runs this round (4 of 4 earlier).
