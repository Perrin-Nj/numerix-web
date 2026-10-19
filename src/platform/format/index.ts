'use client';
import { useLocale } from 'next-intl';
import type { AnswerValue } from '@/data/api/types';

/** Formats an answer for display: 48, "text", or [48, 4] as "48 reste 4" / "48 remainder 4". */
export function useFormatAnswer() {
  const locale = useLocale();
  const word = locale.startsWith('fr') ? 'reste' : 'remainder';
  const nf = new Intl.NumberFormat(locale);
  return (v: AnswerValue): string => {
    if (Array.isArray(v)) {
      if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') return `${nf.format(v[0])} ${word} ${nf.format(v[1])}`;
      return v.map((x) => (Array.isArray(x) ? x.join(' = ') : String(x))).join(', ');
    }
    if (typeof v === 'number') return nf.format(v);
    return String(v);
  };
}
