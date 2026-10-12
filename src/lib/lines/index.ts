'use client';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

// Last line per pool, so the same pool never repeats twice in a row.
const last = new Map<string, string>();

/** Pure picker, exported for stories and checks. */
export function pickFrom(pool: string, lines: readonly string[], rnd: () => number = Math.random): string {
  if (lines.length === 0) return '';
  const prev = last.get(pool);
  const choices = lines.length > 1 ? lines.filter((l) => l !== prev) : lines;
  const next = choices[Math.floor(rnd() * choices.length)] ?? choices[0];
  last.set(pool, next);
  return next;
}

/** `pick('mascot.amazed')` returns a random line from the array at `lines.mascot.amazed`. */
export function usePickLine() {
  const t = useTranslations('lines');
  return useCallback(
    (pool: string): string => {
      const raw = t.raw(pool) as unknown;
      return Array.isArray(raw) ? pickFrom(pool, raw.filter((x): x is string => typeof x === 'string')) : '';
    },
    [t],
  );
}
