'use client';
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNotifications } from '@/lib/notify';
import type { AppNotification } from '@/lib/api/platform-types';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { InlineError } from '@/ui/inline-error';
import { Sheet } from '@/ui/sheet';

export type NotificationCenterBellProps = {
  /** Output of `useLocalReminders(...)`. Optional: without it only server notifications show. */
  reminders?: AppNotification[];
  /** Pass false on screens with no parent session. */
  enabled?: boolean;
  className?: string;
};

/** Bell with an unread count. Opens a sheet with the list; opening an item marks it read. */
export function NotificationCenterBell({ reminders, enabled = true, className }: NotificationCenterBellProps) {
  const t = useTranslations('lib.notify.ui.bell');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const n = useNotifications(reminders, enabled);

  return (
    <>
      <span className={cn('relative inline-flex', className)}>
        <IconButton
          variant="ghost"
          label={n.unread ? t('labelUnread', { count: n.unread }) : t('label')}
          icon={<Bell size={22} aria-hidden />}
          onClick={() => setOpen(true)}
        />
        {n.unread > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-sm font-bold text-brand-fg"
          >
            {n.unread > 9 ? '9+' : n.unread}
          </span>
        )}
      </span>
      <Sheet open={open} onOpenChange={setOpen} title={t('title')} side="right">
        {n.error && (
          <div className="flex flex-col items-start gap-2">
            <InlineError message={t('loadError')} />
            <Button size="sm" variant="secondary" onClick={() => void n.refetch()}>
              {t('retry')}
            </Button>
          </div>
        )}
        {n.items.length === 0 && !n.error && <p className="text-muted">{t('empty')}</p>}
        {n.unread > 0 && (
          <Button size="sm" variant="ghost" className="self-start" onClick={n.markAllRead}>
            {t('markAll')}
          </Button>
        )}
        <ul className="flex flex-col gap-3">
          {n.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => n.markRead(item.id)}
                className={cn(
                  'flex w-full flex-col gap-1 rounded-lg border-2 p-3 text-left text-fg',
                  item.read ? 'border-line bg-elevated' : 'border-brand bg-brand-soft',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold">{item.title}</span>
                  {!item.read && <span className="rounded-full bg-brand px-2 text-sm font-bold text-brand-fg">{t('new')}</span>}
                </span>
                <span className="text-muted">{item.body}</span>
                <time dateTime={item.created_at} className="text-sm text-muted">
                  {format.relativeTime(new Date(item.created_at), new Date())}
                </time>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
