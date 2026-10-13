# features/notify

- `reminders.ts`: pure rules (play reminder, time limit, subscription expiring, payment due), tested by `scripts/check-reminders.mjs`.
- `useLocalReminders.ts`, `useNotifications.ts`: in-app notification list (server plus local).
- `browser.ts`: Notification API permission, web push subscription (needs a VAPID key and the backend sender, BE-26).
