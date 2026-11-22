# Numerix Constitution

## Core Principles

### I. Spec first
No code before an approved spec, plan and task list under `specs/`. Every change maps to a requirement id (FR-xxx) and a test. Specs record the owner's decisions verbatim.

### II. Owner authority
Only the owner authorises code on `main`. Work lands through one reviewed pull request with green required checks and a QA sign-off document. No AI attribution lines in commits or pull requests.

### III. Child safety and product tone (non-negotiable)
Child-facing copy is warm, human and correct for the grade. No timers, hurry words, em dashes or emoji in questions. Images and animations must never mislead: they must match the numbers and the situation in the question.

### IV. Questions are the product
In-play questions get the most care: each question has its own scene, its own motion, and an answer reveal that teaches. Reused generic scenes do not satisfy a question.

### V. Grade-true difficulty
Content and difficulty follow the Quebec curriculum (PFEQ) for grades 1 to 4. A grade 1 child never sees grade 4 work, and a grade 4 child is not served grade 1 drills. Drill-style operations belong to the lower grades only.

### VI. Test before trust
Every change is verified locally against a production-like setup (API + web), with Playwright on phone, tablet, desktop, TV and shared-screen sizes, plus an independent QA agent sign-off. Animations also get an expert review per question.

### VII. Security, performance, accessibility
No new vulnerabilities (govulncheck, audit clean). Animations run at 60 fps on mid phones, respect reduced motion, and are keyboard and screen-reader safe. Config-first: environment values go through `config/`.

### VIII. Safe rollout
Backward-compatible API and data changes, reversible, with a rollout note. Existing children keep their saved settings.

## Governance
This constitution outranks other practices. Amendments need the owner's approval and a recorded rationale.

**Version**: 1.0.0 | **Ratified**: 2026-11-17
