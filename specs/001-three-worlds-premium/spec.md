# Feature Specification: Three Premium Worlds, Grade-True Play, Parent and Admin Fixes

**Feature**: `001-three-worlds-premium` | **Status**: Draft for expert validation | **Date**: 2026-11-17
**Repos**: `numerix-web` (frontend, admin) and `numerix-api` (Go). One PR per repo, QA sign-off before merge.
**Source**: early-return meeting notes (14 bugs, 3 priorities, 6 ideas) plus the owner's answers below. Owner words are binding.

## Owner decisions (verbatim intent)

1. Focus on the **three default worlds** (`echecs`, `medecine`, `espace`). Make them solid: navigation, deep 3D animation, question by question. An **animation expert QA** reviews **every question** so the animation is unique, captivating and matches the question. Cost and tokens do not matter. This is the most important part.
2. **Difficulty by grade** must exist.
3. Free access (trial) wording: **never shown on the parent or child view**. Only the admin can grant or change free access.
4. Improve profile cards. The owner dislikes the border radius added earlier: redesign it in a human way. Child profile delete must be easy to find.
5. Improve responsiveness and screen adaptability. A QA agent tests it throughout.
6. Fix scroll, text-jump and disappearing-question bugs. Test carefully with Playwright on all screens, including **screen sharing** (resized or odd viewports).
7. **Retry**: first attempt counts for mastery. Use best practices so it is enjoyable.
8. **Operations drills only for lower grades.** Research Quebec (PFEQ) expectations per grade and create more questions by grade difficulty.
9. **Validation rule** so a question cannot publish with a media mismatch. QA validates the first 3 worlds across **grades 1 to 4 together**. Must work from day one.
10. No rush: all four grades together, step by step, question by question.
11. Add **Histoires africaines**, **English** and **French** worlds, present but **inactive**. Parent-side world toggles: labels and switches are too far apart, redesign.
12. Remove **Defis**, **Decouvrir** and **Defi du jour** from the **home page only** (keep them in the nav bar). **Admin can toggle them back on** at will.
13. Everything reviewed by QA, production ready, tested locally first, security, performance and visual beauty checked. Spec-driven (Spec Kit) is mandatory.

14. (2026-11-17, owner confirmed) Defi du jour, Decouvrir and Defis are removed from the **home page only**; nav bar keeps them. The three new inactive worlds ship as catalog entries **plus a few sample questions each** (published=false or world inactive so no child sees them).

15. (2026-11-17, owner) The curriculum is a **level guide only**. Numerix is a game, not school material: no ministry text, exercises or structure are copied. Questions are original, story-driven and written for the level a child can handle at each grade.

16. (2026-11-17, defaults chosen from the level guide `curriculum.md`; owner may veto) Quests on drill skills with grade 3 or 4 stay playable but **story-framed**. Grade 3 operations work inside 1 000 (reading up to 10 000). Tables stay story-only in grades 3 and 4. Decimals (tenths, money) start in grade 4. Word caps apply to both languages, French gets 15 percent more room. `medecine` and `espace` get new grade 1 quests (they start at grade 2 today) and all three worlds get grade 4 quests.

17. (2026-11-17, owner answers to the expert's decisions D1 to D7)
    - **Art style: illustrated 3D** (layered SVG/canvas/CSS 3D scenes). The owner overrides the no-cartoon rule of `docs/HUMAN_VISUALS.md` and `scripts/no-cartoon-check.mjs` for the three worlds' scenes; the rule and the check get a scoped allowlist for these scene components, nothing else changes.
    - **Photo supply:** free licences only (Openverse, NASA, Wikimedia Commons) with licence tracking, used where a real photo helps. No paid stock, no spend.
    - **Trial (D1):** keep sign-up exactly as today (automatic trial, silent). Parents and children never see trial or free wording (neutral "access until {date}"). Only the admin can grant, extend or end free access, on the admin side.
    - **Nav (D2):** keep the child nav bar as it is. Defis, Decouvrir and Defi du jour leave the home page and return only through the admin home-section toggle.
    - **New worlds sample questions:** 3 solid questions per new world (histoires, english, francais), written to the same best practices, in inactive worlds. Quality over quantity.
    - **Defaults chosen by the planner, owner may veto:** world id `histoires` (not `histoires-africaines`) to keep the question id regex; at least 20 questions per world per grade; grade 1 difficulty up to 4; a child with no grade is treated as grade 1.

## Scope

In scope: the three default worlds, the play screen, parent child cards and world toggles, home page sections, admin toggles, grade-true difficulty engine, grade 1 to 4 content for the 3 worlds, media validation rule, new inactive worlds, retry.
Out of scope now: activating the other 17 worlds, grades 5 and 6, English and French as separate modules beyond an inactive placeholder world, new payment features.

## User stories and requirements

### US1 (P1) In-play questions are beautiful and true
A child answers a question and sees a unique animated 3D-feeling scene that matches that question's numbers and story, then a reveal that teaches.
- **FR-001** Every published question in `echecs`, `medecine`, `espace` (grades 1 to 4) has its own scene spec (not a shared generic one), with the objects, counts and values of the question shown correctly.
- **FR-002** Scenes use depth (layered parallax, perspective transforms, shadows, light) and purposeful motion: idle, entrance, answer reveal (correct and wrong), at 60 fps on a mid phone; reduced motion gives a calm static version.
- **FR-003** A per-question **animation review record** (`specs/001-three-worlds-premium/review/<question-id>.md` or one table) states: uniqueness vs other questions, match to the question, attention hook, accessibility, performance. Status must be `approved` by the expert agent before publish.
- **FR-004** Scene numbers are derived from the question data (no hand-typed drift): the dosage case (48 drops) renders 48, never 37.5.
- **FR-005** A clock in a space scene, or any prop that contradicts the story, fails validation.
- **FR-006** The text of the story/context is larger and visually distinct before the question; question stays visible while the owl speaks.

### US2 (P1) Grade-true difficulty and content
- **FR-010** Target difficulty starts from the child's grade (and adjusts with mastery); candidates never include more than one grade below the child's grade, except a small review share.
- **FR-011** Drill-style operation skills (`ARI-OPE-*` drills) are served in grades 1 and 2 only; grades 3 and 4 get operations inside problem and word contexts. Exact skill list set by the curriculum matrix (FR-012).
- **FR-012** A **curriculum matrix** (grade x strand x skill x difficulty, sourced from the Quebec PFEQ mathematics progression) governs content. Researched from official Quebec sources and cited in `curriculum.md`.
- **FR-013** The three worlds get enough questions per grade 1 to 4 and per difficulty 1 to 5 to avoid repeats within a chapter; every grade has at least the quotas in `seed/README.md`.
- **FR-014** Existing children keep their data; difficulty changes apply to new picks only.

### US3 (P1) Retry and play flow
- **FR-020** After a wrong first answer the child may try once more. Mastery uses the first attempt only. The retry shows a gentle hint, never the answer, and gives a smaller reward.
- **FR-021** The idempotency and answer API stays backward compatible: a second answer on the same beat is accepted once, flagged `attempt: 2`, does not change mastery.
- **FR-022** The child can go back to the previous question's reveal without pressing Continue again (read-only review of the last result).
- **FR-023** Navigation inside the three worlds is clear: world page, journey, chapter, question, reveal, continue, with no dead ends.

### US4 (P1) Layout, scroll and screens
- **FR-030** The question and its context are always reachable by scroll; owl bubbles never push the question out of view (cap to the latest bubble).
- **FR-031** Typing or keypad entry never moves the viewport to the bottom or hides the question; works with software keyboards.
- **FR-032** Works at 320 to 3840 px wide, portrait and landscape, short heights (screen sharing, split windows, 600 x 400), zoom 200 percent, TV.
- **FR-033** Playwright suites cover phone, tablet, desktop, TV and shared-screen sizes for the play screen; they run in CI.

### US5 (P2) Parent and admin
- **FR-040** Trial/free-access status is **not shown** to parents or children. Parents see neutral plan information only. Only an admin can grant or change free access (admin API plus admin UI).
- **FR-041** Child profile cards are redesigned (no heavy rounded corners; a calm, human style set in the design tokens), with an obvious Delete profile action behind a typed confirmation.
- **FR-042** World toggles: label and switch in one tappable row, switch next to its label, clear on/off state, accessible.
- **FR-043** New worlds `histoires-africaines`, `english`, `francais` exist in the catalog as **inactive** (not enabled for anyone, hidden from children, visible to admin).
- **FR-044** Home page no longer shows Defis, Decouvrir, Defi du jour. Nav bar keeps them. Admin toggle `home_sections` can turn each back on. Default off.
- **FR-045** Default `enabled_worlds` stays the three worlds; admin can change it.

### US6 (P1) Quality gates
- **FR-050** Media validation rule in the seed validator and admin publish: every media reference must be tagged to the question's subject, numbers and setting; mismatches block publish (tests included).
- **FR-051** Independent QA agent signs off the 3 worlds across grades 1 to 4, locally against a production-like stack, before any push.
- **FR-052** Security: no new vulnerabilities; admin-only actions enforced server side; no parent data exposure.
- **FR-053** Performance: no regression in API p95 or memory; scene assets lazy-loaded, per-scene bundle budget stated in the plan.

## Edge cases
Child with no grade history; grade changed by the parent mid-chapter; a retry after network failure (idempotency); reduced motion; low-end device with no GPU; offline PWA; two children on one device; screen-share resize mid-question; French and English text lengths.

## Success criteria
- SC-001 100 percent of published questions in the 3 worlds have an approved animation review.
- SC-002 Zero media/number mismatches in the validator over all published questions.
- SC-003 A grade 1 and a grade 4 child get measurably different difficulty distributions (test).
- SC-004 Playwright play suite green on all size profiles; no horizontal scroll, question always visible.
- SC-005 QA sign-off documents for web and API, CI green, no open vulnerabilities.

## Assumptions and open items for the expert to challenge
- A1 "3D" is delivered with CSS 3D transforms, SVG and canvas layers (and a lightweight engine only if justified by the plan); no heavy WebGL dependency unless the plan proves it fits the mobile budget.
- A2 Content authored in French and English with both required; reading limits by grade stay per `seed/README.md`.
- A3 The Quebec curriculum research must cite official sources; ambiguous points are listed, not guessed.
- A4 Delivery is phased inside one PR per repo: engine and validation first, then world by world.
