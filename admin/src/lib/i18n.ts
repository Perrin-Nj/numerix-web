'use client';
import { useUI } from './store';
import { fr, type Key } from '@/messages/fr';
import { en } from '@/messages/en';

export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

const dicts = { fr, en } as const;

export function useT(): TFn {
  const locale = useUI((s) => s.locale);
  return (key, vars) => {
    let s: string = dicts[locale][key] ?? fr[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
