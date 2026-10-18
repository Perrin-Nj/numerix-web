# Plan V4: kid language, subscriptions, notifications, god-admin app

## Requests

| # | Request | Lands in |
|---|---------|----------|
| 1 | Kid can change the app language; parent can forbid it (default allowed) | kid Me screen, parent child settings, `settings.kid_can_change_language` |
| 2 | Parent subscription: status badge in settings and menu, "Gérer l'abonnement" with payment methods | parent area, `src/features/parent/subscription/**`, `SubscriptionBadge` |
| 3 | Admin sets each parent paid or unpaid; block and unblock parents | admin app |
| 4 | Play button tells clearly when the family cannot play because of the subscription | `useStartChapter`, Home, Story start (402 `subscription_inactive`) |
| 5 | Notifications: remind to play, too much time played, subscription expiring, please pay | in-app center + browser notifications + service worker push handler |
| 6 | Separate admin app on another server: all info on parents and kids, categorised, simple, god powers, every config editable, state manager | `admin/` (own Vercel project) + platform API in the Go API |
| 7 | Download French and English voices | OS task (needs elevation), guidance in Me panel |

## Ambiguity found in request 3 and decision

The text says unpaid parents' kids "can play with no problem" and paid parents' kids "must pay". Taken literally this charges the already-paying family again, so the reading used here is the reverse: **paid (or trial) = kids play freely; unpaid, expired or blocked = the Play button explains why and does not start**. The policy is a platform setting `unpaid_policy` (`block` default, `allow` for the literal reading) that the admin can flip in one click, so no code change is needed if the owner meant the other way.

## Contract (shared by all three work packages)



- `Parent { id, email, name, created_at, locale, status: 'active'|'blocked', blocked_reason?, subscription: Subscription, children_count }`
- `Subscription { status: 'trial'|'active'|'unpaid'|'expired'|'canceled', plan: 'free'|'family_monthly'|'family_yearly', method?: 'card'|'interac'|'paypal'|'apple_pay'|'google_pay', renews_at?: ISO, trial_ends_at?: ISO, marked_by_admin?: boolean }`
- `Child` as today plus `last_seen_at`, `minutes_today`, `sessions_total`, `cards_total`, `skills_mastered`, `settings` (adds `kid_can_change_language: boolean` default true).
- `Notification { id, kind: 'play_reminder'|'time_limit'|'subscription_expiring'|'payment_due'|'announcement', title, body, created_at, read, audience: 'parent'|'child' }`
- `PlatformConfig { card_threshold_pct (70), unpaid_policy ('block'|'allow'), trial_days (14), daily_time_limit_minutes_default, reminder_hour_local, expiring_warning_days (7), default_locale, features: {...} }`
- `AuditEntry { id, at, actor, action, target_type, target_id, detail }` (every admin action, because god access to children's data needs a trace under Law 25).




Admin endpoints (`/admin/v1/*`, bearer `ADMIN_API_TOKEN`, never reachable from the kid app origin): `GET /overview`, `GET /parents?status=&q=&page=`, `GET/PATCH /parents/{id}` (block, unblock, set subscription paid or unpaid, extend, delete), `GET /children?parent=&q=`, `GET/PATCH /children/{id}`, `GET /subscriptions/plans` + `PUT`, `GET/PUT /config`, `POST /notifications/broadcast`, `GET /notifications`, `GET /audit`.

Implementations: in-memory seeded (default, resets on cold start) and Upstash Redis through its REST API when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (needs the Vercel marketplace integration, a user action). With Redis the admin toggle reaches the kid app live; without it the admin demo works on seeded data only. The README says which mode is on.

## Work packages and ownership (no overlaps)

| Agent | Owns | Delivers |
|-------|------|----------|
| admin | `admin/**` (new Next app, own package.json, own Vercel project) | login, overview, parents, parent detail, kids, kid detail, plans, config, notifications, audit; zustand store; shell test script |
| parent-app | `src/features/parent/subscription/**`, `src/features/play/Subscription*`, `src/features/notify/**`, `public/sw` push handler, `src/data/api` types | manage subscription screen, badge, paywall message, notification center, reminders |
| lead | `StoryScreen`, `HomeFeed`, `MeScreen` language switch, `useStartChapter`, hooks wiring, docs, tests, deploy | integration |

## Criticism of this plan

1. The two apps cannot share live data without a shared store. Fixed by the PlatformStore interface plus Redis when available; the limit is stated, not hidden.
2. Real payments need a processor (Stripe) and PCI scope. no card fields are collected in the app, the processor's hosted page would be used (BE-24). Payment method list is data from `GET /subscriptions/plans`.
3. Real push (when the app is closed) needs VAPID keys and a sender service. The app ships the service worker handler and subscription call (BE-26); until then reminders show as in-app banners and browser notifications while the app is open. No claim of background push is made.
4. God-admin access to children's data is sensitive: admin login is separate, audited, rate limited, and every read of a child record is logged. Admin password comes from env, never in the repo.
5. A permanent block on kids because of billing is harsh for children: the Play button explains it kindly and points to the grown-up; progress is never deleted.
6. Admin is a different product from the kid app, so Storybook-only does not apply there; it still follows no-silent-errors and plain copy (French first, English toggle).
7. The kid language switch must respect the parent flag on the server too (setting returned with the child profile), not only hide the button.

## Todos

| id | Task | Owner |
|----|------|-------|
| V4-1 | Plan, contract, criticism | lead (this file) |
| V4-2 | Platform store, admin API, subscription and notification routes, 402 gate | platform |
| V4-3 | Admin app | admin |
| V4-4 | Subscription screens, badge, notification center, reminders | parent-app |
| V4-5 | Kid language switch with parent flag | lead |
| V4-6 | Play-button paywall message wiring | lead |
| V4-7 | Voices: guidance in Me panel, OS install steps | lead |
| V4-8 | Shell tests for every flow, docs, deploy admin project, PR | lead |

## Tests (shell, one line per check)


