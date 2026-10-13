# domain/game

| file | role |
|------|------|
| `catalog.ts` | 8 worlds, 7 skills with misconceptions, challenges, welcome card |
| `events.ts` | `GameEvent`: start, answer, finish, card, react, puzzle, accept, gift, tour |
| `rules.ts` | pass threshold (`passes`), `READY_AHEAD` steps open beyond completed ones |
| `selectors.ts` | derive journey nodes, progress, streak, goals, cards, challenges, reports from events |
| `types.ts` | view types shared with the UI |
| `clock.ts` | `nowMs()` so time is injectable in tests |

Rule of thumb: if a number appears on screen, a selector here computes it, and `scripts/state-checks.mjs` tests it.
