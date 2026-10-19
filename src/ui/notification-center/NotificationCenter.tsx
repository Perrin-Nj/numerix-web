'use client';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon, type IconName } from '@/ui/icon';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import {
  useNotificationStore,
  type Notification,
  type NotificationKind,
  type StoredNotification,
} from './store';

export { useNotificationStore };
export type { Notification, NotificationKind };

const DEFAULT_MS: Partial<Record<NotificationKind, number>> = { success: 5000, info: 5000 };

const LOOK: Record<NotificationKind, { icon: IconName; border: string; color: string }> = {
  success: { icon: 'check', border: 'border-success', color: 'text-success' },
  info: { icon: 'info', border: 'border-info', color: 'text-info' },
  warning: { icon: 'alert', border: 'border-warning', color: 'text-warning' },
  error: { icon: 'alert', border: 'border-danger', color: 'text-danger' },
};

/** Hook returning the function that pushes a toast into the notification center. */
export function useNotify() {
  const { play } = useSound();
  const add = useNotificationStore((s) => s.add);
  const remove = useNotificationStore((s) => s.remove);
  const notify = useCallback(
    (n: Notification) => {
      if (n.kind === 'success' || n.kind === 'info') play('confirm');
      if (n.kind === 'warning') play('notice_warning');
      if (n.kind === 'error') play('notice_error');
      return add(n);
    },
    [add, play],
  );
  return useMemo(() => ({ notify, dismiss: remove }), [notify, remove]);
}

const Toast = memo(function Toast({ item }: { item: StoredNotification }) {
  const t = useTranslations('ui.notificationCenter');
  const remove = useNotificationStore((s) => s.remove);
  const look = LOOK[item.kind];
  const ms = item.durationMs ?? DEFAULT_MS[item.kind];

  useEffect(() => {
    if (!ms) return;
    const timer = setTimeout(() => remove(item.id), ms);
    return () => clearTimeout(timer);
  }, [ms, item.id, remove]);

  return (
    <li
      role={item.kind === 'error' ? 'alert' : undefined}
      className={cn(
        'nx-pop pointer-events-auto flex items-start gap-3 rounded-lg border-2 bg-elevated p-4 text-fg shadow-3',
        look.border,
      )}
    >
      <Icon name={look.icon} size={22} className={cn('mt-0.5', look.color)} />
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold">{item.title}</p>
        {item.description && <p className="text-muted">{item.description}</p>}
        {item.action && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => {
              item.action?.onClick();
              remove(item.id);
            }}
          >
            {item.action.label}
          </Button>
        )}
      </div>
      <IconButton label={t('dismiss')} icon={<Icon name="x" />} onClick={() => remove(item.id)} />
    </li>
  );
});

/** Mount once in the app providers. */
export function NotificationCenter() {
  const t = useTranslations('ui.notificationCenter');
  const items = useNotificationStore((s) => s.items);
  const errors = items.filter((i) => i.kind === 'error');
  const others = items.filter((i) => i.kind !== 'error');
  const list = 'flex flex-col gap-3';

  return (
    <div
      aria-label={t('region')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-md flex-col gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul aria-live="polite" className={list}>
        {others.map((i) => (
          <Toast key={i.id} item={i} />
        ))}
      </ul>
      <ul aria-live="assertive" className={list}>
        {errors.map((i) => (
          <Toast key={i.id} item={i} />
        ))}
      </ul>
    </div>
  );
}
