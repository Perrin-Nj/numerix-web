'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMarkNotificationRead, useServerNotifications } from '@/data/hooks/platform';
import type { AppNotification } from '@/data/api/platform-types';
import { showBrowserNotification } from './browser';

/**
 * Server notifications (polled every 60 s while the tab is visible) merged with local reminders.
 * Unread items also go to the system notification area once, when the user allowed it.
 */
export function useNotifications(local: AppNotification[] = [], enabled = true) {
  const server = useServerNotifications(enabled);
  const mark = useMarkNotificationRead();
  const [readLocal, setReadLocal] = useState<ReadonlySet<string>>(new Set());

  const items = useMemo<AppNotification[]>(() => {
    const remote = (server.data ?? []).filter((n) => n.audience === 'parent').map((n): AppNotification => ({ ...n }));
    const mine = local.map((n) => ({ ...n, read: readLocal.has(n.id) }));
    return [...mine, ...remote].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [server.data, local, readLocal]);

  useEffect(() => {
    for (const n of items) if (!n.read) void showBrowserNotification(n);
  }, [items]);

  const markRead = useCallback(
    (id: string) => {
      const item = items.find((n) => n.id === id);
      if (!item || item.read) return;
      if (item.local) setReadLocal((s) => new Set(s).add(id));
      else mark.mutate(id);
    },
    [items, mark],
  );

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    markRead,
    markAllRead: () => items.forEach((n) => markRead(n.id)),
    isLoading: server.isLoading,
    error: server.error,
    refetch: server.refetch,
  };
}
