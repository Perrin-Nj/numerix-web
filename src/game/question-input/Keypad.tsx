'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon } from '@/ui/icon';
import { CHOICE_STATE } from '@/game/choice-button';
import { wantsRemainder, type InputProps } from './kind';

const MAX_LEN = 9;

/** "12,5" or "12.5" or "-3" to a number; null while it is not a number yet. */
export function parseEntry(text: string): number | null {
  if (!/\d/.test(text)) return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const KEY = 'lift flex min-h-12 items-center justify-center rounded-md border-2 border-line bg-elevated font-display text-2xl font-bold text-fg shadow-1 disabled:pointer-events-none disabled:opacity-60';

/** Big keypad for numeric answers: digits, minus, decimal comma, erase. Physical keyboard works too. */
export function Keypad({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const t = useTranslations('game.questionInput');
  const locale = useLocale();
  const { play } = useSound();
  const comma = locale.startsWith('fr') ? ',' : '.';
  const remainder = wantsRemainder(question);
  const locked = phase !== 'question';
  const [q, setQ] = useState('');
  const [r, setR] = useState('');
  const [field, setField] = useState<'q' | 'r'>('q');
  const set = field === 'q' ? setQ : setR;

  const press = useCallback(
    (k: string) => {
      if (locked) return;
      play('tap');
      set((v) => {
        if (k === 'back') return v.slice(0, -1);
        if (k === 'sign') return v.startsWith('-') ? v.slice(1) : v ? `-${v}` : '-';
        if (k === 'dot') return v.includes(',') || v.includes('.') || !v || v === '-' ? v : v + comma;
        return v.length >= MAX_LEN ? v : v + k;
      });
    },
    [locked, play, set, comma],
  );

  const ready = remainder ? parseEntry(q) !== null && parseEntry(r) !== null : parseEntry(q) !== null;
  const ok = useCallback(() => {
    if (locked) return;
    if (remainder) {
      if (field === 'q' && parseEntry(q) !== null && parseEntry(r) === null) return setField('r');
      const a = parseEntry(q);
      const b = parseEntry(r);
      if (a !== null && b !== null) onSubmit([a, b]);
      return;
    }
    const a = parseEntry(q);
    if (a !== null) onSubmit(a);
  }, [locked, remainder, field, q, r, onSubmit]);

  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input,textarea,select,[contenteditable]')) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === ',' || e.key === '.') press('dot');
      else if (e.key === '-') press('sign');
      else if (e.key === 'Enter') ok();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, press, ok]);

  const shown = (f: 'q' | 'r') => {
    if (locked && chosen !== null) {
      const n = Array.isArray(chosen) && typeof chosen[0] === 'number' ? chosen[f === 'q' ? 0 : 1] : chosen;
      return String(n).replace('.', comma);
    }
    return f === 'q' ? q : r;
  };
  const state = phase === 'question' ? 'idle' : phase === 'answering' ? 'selected' : outcome === 'correct' ? 'success' : 'miss';

  const renderField = (f: 'q' | 'r', label: string) => (
    <button
      type="button"
      disabled={locked}
      onClick={() => setField(f)}
      aria-label={label}
      aria-live="polite"
      className={cn(
        'flex min-h-12 min-w-0 flex-1 items-center justify-end gap-2 rounded-md border-2 px-3 font-display text-3xl font-bold tabular-nums',
        remainder && field === f && !locked ? 'border-brand ring-4 ring-brand/30' : '',
        CHOICE_STATE[state],
      )}
    >
      {remainder && <span className="me-auto text-sm font-semibold text-muted">{label}</span>}
      <span>{shown(f) || <span className="text-muted">?</span>}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={t('keypad')}>
      <div className="flex gap-2">
        {renderField('q', remainder ? t('quotient') : t('answer'))}
        {remainder && renderField('r', t('remainder'))}
      </div>
      <div className="grid grid-cols-4 grid-rows-4 gap-1.5">
        {['1', '2', '3'].map((k) => (
          <button key={k} type="button" disabled={locked} className={KEY} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" disabled={locked} className={KEY} onClick={() => press('back')} aria-label={t('erase')}>
          ⌫
        </button>
        {['4', '5', '6'].map((k) => (
          <button key={k} type="button" disabled={locked} className={KEY} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button
          type="button"
          disabled={locked || !ready}
          onClick={ok}
          aria-label={t('check')}
          className="lift row-span-3 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-brand bg-brand font-display text-lg font-bold text-brand-fg shadow-2 disabled:pointer-events-none disabled:opacity-50 sm:text-xl"
        >
          <Icon name="check" size={28} />
          <span className="text-sm">{remainder && field === 'q' && parseEntry(r) === null && parseEntry(q) !== null ? t('next') : t('check')}</span>
        </button>
        {['7', '8', '9'].map((k) => (
          <button key={k} type="button" disabled={locked} className={KEY} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" disabled={locked} className={KEY} onClick={() => press('sign')} aria-label={t('minus')}>
          −
        </button>
        <button type="button" disabled={locked} className={KEY} onClick={() => press('0')}>
          0
        </button>
        <button type="button" disabled={locked} className={KEY} onClick={() => press('dot')} aria-label={t('decimal')}>
          {comma}
        </button>
      </div>
    </div>
  );
}
