# data/local

On-device state while the server does not own progress (`NEXT_PUBLIC_STATE_SOURCE=local`).

- `store.ts`: zustand store `nx:game:v1`, persisted per child. `append(childId, event)` records one event; `claimGift`, `popCelebration`, `reset`.
- `who.ts`: the kid's first name and avatar, remembered at sign-in for greetings and the Me page.

Events are defined in `domain/game/events.ts`; screens read derived numbers from `domain/game/selectors.ts`.
