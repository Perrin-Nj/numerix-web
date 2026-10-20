# QA sign-off

Date: 2026-10-20. Candidate: frontend `release/candidate` 01aaff8, numerix-api main 0e2bd4c.

NOT SIGNED OFF.

Reasons (open P1, details and repro in `docs/QA_REPORT.md`, tests in `docs/REGRESSION_INDEX.md`):
- QA-A-008: the feedback sheet still hides the tail of the question on a 360x740 phone without scrolling (`scripts/qa/regress-strict.mjs`, 3 of 20 fail).
- QA-BE-004: a chapter locked by prerequisites starts through an explicit `skill_id` (`scripts/qa/extra.mjs`, 10 of 93 locked nodes).
- QA-BE-005: passkey registration fails with a virtual authenticator (`scripts/qa/extra.mjs`), root cause not triaged.
- P2 W-001 (JS budget) is open; the brief allows P2 only once the owner accepts it.

Green evidence: go test -count=3 1446 passed; sweep 63 loads, 0 P0, 0 P1; feed 200 items verified by `test.sh feed`; api-fuzz 141 calls, 0 x 5xx; load 50 rps x 30 s twice, p95 answer 1.7 ms, beats 3.7 ms, health 0 ms.
