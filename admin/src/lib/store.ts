'use client';
import { create } from 'zustand';

export type Locale = 'fr' | 'en';
export type Theme = 'light' | 'dark';

export interface Toast {
  id: number;
  kind: 'ok' | 'err';
  text: string;
}

interface UI {
  locale: Locale;
  theme: Theme;
  navOpen: boolean;
  toasts: Toast[];
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  setNav: (o: boolean) => void;
  toast: (kind: Toast['kind'], text: string) => void;
  dismiss: (id: number) => void;
}

const safe = (fn: () => void) => {
  try {
    fn();
  } catch {
    // storage blocked: keep in-memory state only
  }
};
let n = 0;

export const useUI = create<UI>((set) => ({
  locale: 'fr',
  theme: 'light',
  navOpen: false,
  toasts: [],
  setLocale: (locale) => {
    safe(() => localStorage.setItem('nx_locale', locale));
    document.documentElement.lang = locale;
    set({ locale });
  },
  setTheme: (theme) => {
    safe(() => localStorage.setItem('nx_theme', theme));
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  setNav: (navOpen) => set({ navOpen }),
  toast: (kind, text) => {
    const id = ++n;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'err' ? 7000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export interface ListFilters {
  q: string;
  status: string;
  sub: string;
  plan: string;
  grade: string;
  page: number;
}
const empty: ListFilters = { q: '', status: 'all', sub: 'all', plan: 'all', grade: 'all', page: 1 };

interface Filters {
  parents: ListFilters;
  children: ListFilters;
  audit: { q: string; action: string; page: number };
  selected: string[];
  setParents: (p: Partial<ListFilters>) => void;
  setChildren: (p: Partial<ListFilters>) => void;
  setAudit: (p: Partial<Filters['audit']>) => void;
  toggle: (id: string) => void;
  clearSel: () => void;
}
// Any filter change resets to page 1 unless the page itself changes.
const merge = <T extends { page: number }>(cur: T, p: Partial<T>): T => ({ ...cur, page: 1, ...p });

export const useFilters = create<Filters>((set) => ({
  parents: empty,
  children: empty,
  audit: { q: '', action: '', page: 1 },
  selected: [],
  setParents: (p) => set((s) => ({ parents: merge(s.parents, p) })),
  setChildren: (p) => set((s) => ({ children: merge(s.children, p) })),
  setAudit: (p) => set((s) => ({ audit: merge(s.audit, p) })),
  toggle: (id) => set((s) => ({ selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] })),
  clearSel: () => set({ selected: [] }),
}));
