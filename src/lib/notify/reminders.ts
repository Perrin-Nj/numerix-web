// Pure reminder rules. No runtime imports so node can run them (scripts/check-reminders.mjs).
import type { Subscription } from '../api/platform-types.ts';

export type ReminderKind = 'play_reminder' | 'time_limit' | 'subscription_expiring' | 'payment_due';

export type ReminderInput = {
  childName: string;
  minutesToday: number;
  /** 0 or less means no limit. */
  dailyLimit: number;
  subscription?: Subscription | null;
  /** ISO time of the last finished play, null when never. */
  lastPlayedAt?: string | null;
  /** Local hour (0-23) after which a play reminder is allowed. */
  reminderHour?: number;
  expiringWarningDays?: number;
};

export type Reminder = { id: string; kind: ReminderKind; params: { name: string; count?: number; limit?: number } };

const DAY = 86_400_000;

export function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Whole days left until `iso`, rounded up. Negative means already over, NaN means missing or unreadable. */
export function daysUntil(iso: string | undefined, now: Date): number {
  if (!iso) return Number.NaN;
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY);
}

export function dayKey(now: Date) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function computeReminders(input: ReminderInput, now: Date): Reminder[] {
  const { childName: name, minutesToday, dailyLimit, subscription: sub, lastPlayedAt } = input;
  const reminderHour = input.reminderHour ?? 17;
  const warn = input.expiringWarningDays ?? 7;
  const day = dayKey(now);
  const out: Reminder[] = [];

  const limitReached = dailyLimit > 0 && minutesToday >= dailyLimit;
  if (limitReached) out.push({ id: `time_limit:${day}`, kind: 'time_limit', params: { name, count: minutesToday, limit: dailyLimit } });

  const playedToday = minutesToday > 0 || (!!lastPlayedAt && sameLocalDay(new Date(lastPlayedAt), now));
  if (!playedToday && !limitReached && now.getHours() >= reminderHour) {
    out.push({ id: `play_reminder:${day}`, kind: 'play_reminder', params: { name } });
  }

  if (sub?.status === 'unpaid') out.push({ id: `payment_due:${day}`, kind: 'payment_due', params: { name } });

  // Access ends at the end of the trial, or at the end of the paid period once canceled.
  const endsAt = sub?.status === 'trial' ? sub.trial_ends_at : sub?.status === 'canceled' ? sub.renews_at : undefined;
  const left = daysUntil(endsAt, now);
  if (left >= 0 && left <= warn) out.push({ id: `subscription_expiring:${day}`, kind: 'subscription_expiring', params: { name, count: left } });

  return out;
}
