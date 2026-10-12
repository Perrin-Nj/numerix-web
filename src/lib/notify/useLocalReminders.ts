'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AppNotification, Subscription } from '@/lib/api/platform-types';
import { computeReminders } from './reminders';

export type LocalRemindersInput = {
  childName: string;
  minutesToday: number;
  dailyLimit: number;
  subscription?: Subscription | null;
  lastPlayedAt?: string | null;
  reminderHour?: number;
  expiringWarningDays?: number;
};

/** In-app reminders from local rules. Re-evaluated every minute so the reminder hour is noticed without a reload. */
export function useLocalReminders(input: LocalRemindersInput): AppNotification[] {
  const t = useTranslations('lib.notify.reminders');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { childName, minutesToday, dailyLimit, subscription, lastPlayedAt, reminderHour, expiringWarningDays } = input;
  const hour = now.getHours();
  const date = now.getDate();
  return useMemo(
    () =>
      computeReminders({ childName, minutesToday, dailyLimit, subscription, lastPlayedAt, reminderHour, expiringWarningDays }, now).map((r) => ({
        id: r.id,
        kind: r.kind,
        title: t(`${r.kind}.title`, r.params),
        body: t(`${r.kind}.body`, r.params),
        created_at: now.toISOString(),
        read: false,
        local: true,
      })),
    // `now` changes each minute, which would make created_at jump; keep it stable per rule result by depending on the minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childName, minutesToday, dailyLimit, subscription, lastPlayedAt, reminderHour, expiringWarningDays, hour, date, t],
  );
}
