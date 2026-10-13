# data/hooks

Import from `@/data/hooks` (the barrel). Files:

| file | concern |
|------|---------|
| `keys.ts` | query keys, `apiOn` switch |
| `session.ts` | who is signed in on this device, sign out |
| `auth.ts` | register, login, consent |
| `children.ts` | profiles, child token, settings, export |
| `sessions.ts` | the play loop: start, beats, answers, pause, resume, finish |
| `feed.ts` | the discovery feed |
| `state.ts` | home, journey, collection, engagement, growth, quest, progress, reports, challenges (local or server) |
| `platform.ts` | subscription, plans, checkout, notifications, platform config |

Add a hook next to its concern; keep screens free of query keys.
