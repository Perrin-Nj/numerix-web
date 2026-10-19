import { create } from 'zustand';

export type NotificationKind = 'success' | 'info' | 'warning' | 'error';

export type Notification = {
  id?: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  /** Success and info default to 5s. Warning and error persist unless this is set. */
  durationMs?: number;
};

export type StoredNotification = Notification & { id: string };

type State = {
  items: StoredNotification[];
  add: (n: Notification) => string;
  remove: (id: string) => void;
  clear: () => void;
};

let seq = 0;

/** Zustand store holding the queued notifications. */
export const useNotificationStore = create<State>((set) => ({
  items: [],
  add: (n) => {
    const id = n.id ?? `n-${Date.now()}-${seq++}`;
    set((s) => ({ items: [...s.items.filter((i) => i.id !== id), { ...n, id }] }));
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));
