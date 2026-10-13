// Node 22 (type stripping): pure reminder rules, no browser. Run: node scripts/check-reminders.mjs
import assert from 'node:assert/strict';
import { computeReminders, daysUntil, sameLocalDay } from '../src/lib/notify/reminders.ts';

const at = (h, d = 12) => new Date(2026, 9, d, h, 0, 0); // local time, so the checks do not depend on the machine zone
const iso = (d) => new Date(2026, 9, d, 12, 0, 0).toISOString();
const base = { childName: 'Lea', minutesToday: 0, dailyLimit: 30, lastPlayedAt: null };
const kinds = (input, now) => computeReminders(input, now).map((r) => r.kind);
let n = 0;
const t = (name, fn) => {
  fn();
  n++;
  console.log('ok  ' + name);
};

t('play reminder after the reminder hour when nothing played', () => assert.deepEqual(kinds(base, at(18)), ['play_reminder']));
t('no play reminder before the hour', () => assert.deepEqual(kinds(base, at(9)), []));
t('custom reminder hour', () => assert.deepEqual(kinds({ ...base, reminderHour: 8 }, at(9)), ['play_reminder']));
t('no play reminder when minutes played today', () => assert.deepEqual(kinds({ ...base, minutesToday: 5 }, at(19)), []));
t('no play reminder when last played today', () => assert.deepEqual(kinds({ ...base, lastPlayedAt: at(8).toISOString() }, at(19)), []));
t('play reminder when last played yesterday', () => assert.deepEqual(kinds({ ...base, lastPlayedAt: at(18, 11).toISOString() }, at(19)), ['play_reminder']));
t('time limit reached at exactly the limit', () => assert.deepEqual(kinds({ ...base, minutesToday: 30 }, at(10)), ['time_limit']));
t('time limit not reached below the limit', () => assert.deepEqual(kinds({ ...base, minutesToday: 29 }, at(10)), []));
t('no limit when dailyLimit is 0', () => assert.deepEqual(kinds({ ...base, minutesToday: 500, dailyLimit: 0 }, at(10)), []));
t('time limit params carry minutes and limit', () => {
  const [r] = computeReminders({ ...base, minutesToday: 40 }, at(10));
  assert.deepEqual(r.params, { name: 'Lea', count: 40, limit: 30 });
});
t('trial ending in 3 days warns', () => {
  const r = computeReminders({ ...base, minutesToday: 1, subscription: { status: 'trial', plan: 'free', trial_ends_at: iso(15) } }, at(12));
  assert.equal(r[0].kind, 'subscription_expiring');
  assert.equal(r[0].params.count, 3);
});
t('trial ending in 30 days does not warn', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, subscription: { status: 'trial', plan: 'free', trial_ends_at: iso(42) } }, at(12)), []));
t('warning window is configurable', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, expiringWarningDays: 2, subscription: { status: 'trial', plan: 'free', trial_ends_at: iso(15) } }, at(12)), []));
t('canceled plan warns before access ends', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, subscription: { status: 'canceled', plan: 'family_monthly', renews_at: iso(14) } }, at(12)), ['subscription_expiring']));
t('active plan renewing soon is not an expiry', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, subscription: { status: 'active', plan: 'family_monthly', renews_at: iso(14) } }, at(12)), []));
t('already ended trial does not warn (the status covers it)', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, subscription: { status: 'trial', plan: 'free', trial_ends_at: iso(5) } }, at(12)), []));
t('unpaid asks to pay', () =>
  assert.deepEqual(kinds({ ...base, minutesToday: 1, subscription: { status: 'unpaid', plan: 'family_monthly' } }, at(12)), ['payment_due']));
t('limit reached suppresses the play reminder', () => assert.deepEqual(kinds({ ...base, minutesToday: 30 }, at(20)), ['time_limit']));
t('several reminders together', () =>
  assert.deepEqual(kinds({ ...base, subscription: { status: 'unpaid', plan: 'family_monthly' } }, at(18)), ['play_reminder', 'payment_due']));
t('ids change with the day so a reminder can come back tomorrow', () =>
  assert.notEqual(computeReminders(base, at(18, 12))[0].id, computeReminders(base, at(18, 13))[0].id));
t('daysUntil handles missing and bad input', () => {
  assert.ok(Number.isNaN(daysUntil(undefined, at(1))));
  assert.ok(Number.isNaN(daysUntil('nope', at(1))));
});
t('sameLocalDay', () => {
  assert.ok(sameLocalDay(at(1), at(23)));
  assert.ok(!sameLocalDay(at(1), at(1, 13)));
});
console.log(`${n} checks passed`);
