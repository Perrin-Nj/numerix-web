# Plan v2: a game that remembers, tells real stories and feels alive

Status: written 2026-10-13 after the owner's second review. Sections: request, plan, critique, final decisions, test plan.

## 1. What the owner asked (grouped)

| # | Ask | Meaning |
|---|---|---|
| A | "Le problème vient de nous" on localhost | `pnpm dev` starts the app but not the mock, so the backend is really down. Fix the cause, keep the honest message. |
| B | Sounds | "Une surprise" needs its own low voice; each play should sound different; the scroll sound in the feed is bizarre, remove it. |
| C | Exit | An in-play button to leave the current play. |
| D | State | Trace plays on the client and update every tracking as the play goes: user state, parent feed, parent report, challenges, world map, cards. Real state, no placeholders. Use a state manager. Switchable to the server later. |
| E | Variety | Mascot lines like "Waouh, personne ne l'avait vu venir !" must change. |
| F | One scroll | `/play/home` has two scrollbars. |
| G | Images | Better pictures than emoji on gradients. |
| H | Stories | Every world and every journey node must lead to its own story, not always the chess one. |
| I | Theme | A visible light/dark switch. |
| J | Home menu | More options, for example challenges to take on. |
| K | Feed | Feeds that read as human as possible. |
| L | Rewards | Rewards in the game, a gift on first login. |
| M | Joy | Visibly better, more human, more animated. |

## 2. Plan

### 2.1 Data and state (D, H, L)

- **Local game store** (Zustand, persisted per device) holds an append-only **event log per child**: session started, beat answered, session finished or exited, chapter rewards, feed reaction, feed puzzle, challenge accepted, welcome gift claimed. Pure functions in `src/lib/game/` (no React, no aliases) derive everything from the log: mastery per world and skill, journey node states, streak, daily goal, growth, collection, session list and summaries, weekly report, stuck points, challenge progress. The same functions run in node, so shell tests can check them.
- **State source switch** `NEXT_PUBLIC_STATE_SOURCE=local|api`. In `local`, the data hooks read the store reactively. In `api`, the same hooks call the server (today's behavior). Screens do not change.
- **Content stays on the mock server** (problems, narration, feed, children). The mock becomes world-aware: a chapter is built from the chosen world and skill, with different numbers on every play and a story kit per world (hero, place, tone, success, detour, surprise lines).
- **Challenges** are a client catalog (bilingual): accept one, progress counts only from acceptance, completion grants a card and a celebration, and the parent report lists them. Contract gap recorded in `BACKEND_REQUIREMENTS.md` (BE-20) so the server can take over.
- **First-login gift**: a welcome card plus a celebration, granted once per child (event logged).

### 2.2 Experience (B, C, E, F, G, I, J, K, M)

- **Sounds**: variant pools per outcome (3 each), low-pitched variants for the surprise, no repeat of the last variant, scroll sound removed from the feed.
- **Exit**: a visible exit button on the story screen with a confirm dialog; exiting finishes the session as "exited" and is logged.
- **Lines**: pools of 6+ lines per mascot state and per outcome, never the same line twice in a row.
- **One scroll**: `/play/home` becomes a normal page. The discover feed snaps on the page scroll, not on an inner box.
- **Better images**: original layered SVG scenes per world (sky, parallax shapes, drifting clouds or twinkling stars, a hero), animated and theme aware, replacing the gradient and emoji tiles.
- **Theme**: a `ThemeToggle` (system, light, dark, high contrast) in the play header, welcome screen and parent header.
- **Home menu**: a grid of big tiles (Play, Challenges, Discover, Worlds, Cards, Progress) with badges.
- **Feed voice**: a storyteller persona with a name, second person, questions, jokes, the child's first name, time-of-day greetings; wider variety so no item repeats for a long time.
- **Visual polish**: one design review pass over the main screens, then fixes.

### 2.3 Dev and tests (A)

- `pnpm dev` starts the mock and the app together; the app's health message names the host it tried.
- Tests are shell scripts: `scripts/test.sh` runs the mock self test, the pure game-state checks (node), the HTTP flows and, on request, the browser checks.

## 3. Critique of the plan (and what changed)

1. **Risk: two sources of truth.** If the server and the local log both count progress, numbers drift. Decision: in `local` mode the log is the only source for derived data; the server only supplies content and children. In `api` mode the log is ignored. Never mixed.
2. **Risk: a derived world map that is "real" but wrong.** Mastery is a simple model (+0.25 correct, -0.15 typical error, -0.10 other error, decay after 3 days), not the real engine. Decision: label it in code as a stand-in and keep the selectors small so the server model replaces them.
3. **Risk: "addiction".** The product prompt asks for a healthy habit loop; the docs forbid pressure and extrinsic rewards. Decision: joy through animation, variety, surprise lines, collectible cards, challenges and a welcome gift; no streak shaming, no loss states, no counters or scores on the play screen, parent limits remain. Combo meters are rejected.
4. **Risk: scope.** Four independent work packages (mock content, visuals, sounds, state core) can run in parallel only if files do not overlap. Decision: strict file ownership (section 4).
5. **Risk: persisted state on shared devices.** Progress in `localStorage` is visible to anyone on the device. Decision: key it by child id, store no names, add a "reset demo data" action, document that real persistence belongs to the server.
6. **Risk: fake variety.** More lines of the same shape still feel scripted. Decision: variation by combining pools (opener, event, closer) as well as by picking lines, and by world kit.
7. **Gap accepted**: image assets are code-drawn SVG (original, no licence issue) not illustrator art; the plan proposes them as the best option available without outside assets.
8. **Gap accepted**: challenges are client-only until BE-20 exists.

## 4. Work packages and file ownership

| Package | Owner files | Output |
|---|---|---|
| State core and wiring | `src/lib/game/**`, `src/features/api/hooks.ts`, screens under `src/features/**`, `scripts/*.sh`, `docs/*` | store, selectors, hooks switch, challenges screen, home menu, exit button, event recording |
| Mock content | `mock/**` | world-aware chapters, skill generators, story kits, human feed |
| Visuals and lines | new folders in `src/game/**` and `src/ui/**`, `src/app/globals.css` | `world-scene`, `theme-toggle`, `menu-tile`, `challenge-card`, `welcome-gift`, line pools, richer animations |
| Sounds | `src/lib/audio/**`, `public/sounds/**`, `scripts/check-sounds.mjs` | variant pools, low voices |

## 5. Test plan

- `scripts/test.sh mock`: mock self test (chapters per world and skill, different numbers per seed, no answer in a beat).
- `scripts/test.sh state`: node checks of the pure selectors (journey, streak, challenges, report, collection, welcome gift once).
- `scripts/test.sh flows`: HTTP flows against the running app and mock.
- `scripts/test.sh ui`: browser checks (kid door, PIN, feed grows on page scroll, one scrollbar on home, exit button, theme switch, a full chapter updating the map, cards, challenge and parent report).
- Every script prints one line per check.
