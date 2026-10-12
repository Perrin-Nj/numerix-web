'use client';
import { useLocale } from 'next-intl';
import type { AnswerValue } from '@/lib/api/types';

/** Formats an answer for display: 48, "text", or [48, 4] as "48 reste 4" / "48 remainder 4". */
export function useFormatAnswer() {
  const locale = useLocale();
  const word = locale.startsWith('fr') ? 'reste' : 'remainder';
  const nf = new Intl.NumberFormat(locale);
  return (v: AnswerValue): string => {
    if (Array.isArray(v)) return `${nf.format(v[0])} ${word} ${nf.format(v[1])}`;
    if (typeof v === 'number') return nf.format(v);
    return String(v);
  };
}
