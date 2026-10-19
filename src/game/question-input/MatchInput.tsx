'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Button } from '@/ui/button';
import { CHOICE_STATE } from '@/game/choice-button';
import type { InputProps } from './kind';

/** Matching: tap one on the left, then its partner on the right. Paired cards wear the same number. Tap a pair to undo it. */
export function MatchInput({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const t = useTranslations('game.questionInput');
  const { play } = useSound();
  const left = question.items?.left ?? [];
  const right = question.items?.right ?? [];
  const locked = phase !== 'question';
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const shown: [string, string][] =
    locked && Array.isArray(chosen) && chosen.every((p) => Array.isArray(p)) ? (chosen as unknown as [string, string][]) : pairs;
  const state = phase === 'question' ? 'idle' : phase === 'answering' ? 'selected' : outcome === 'correct' ? 'success' : 'miss';

  const numOf = (id: string, side: 0 | 1) => shown.findIndex((p) => p[side] === id) + 1;
  const tapLeft = (id: string) => {
    if (locked) return;
    play('tap');
    if (numOf(id, 0)) setPairs((p) => p.filter((x) => x[0] !== id));
    else setPick((cur) => (cur === id ? null : id));
  };
  const tapRight = (id: string) => {
    if (locked) return;
    play('tap');
    if (numOf(id, 1)) setPairs((p) => p.filter((x) => x[1] !== id));
    else if (pick) {
      setPairs((p) => [...p, [pick, id]]);
      setPick(null);
    }
  };

  const cell = (id: string, label: string, side: 0 | 1) => {
    const n = numOf(id, side);
    const selected = side === 0 && pick === id;
    return (
      <li key={id}>
        <button
          type="button"
          disabled={locked}
          aria-pressed={n > 0 || selected}
          onClick={() => (side === 0 ? tapLeft(id) : tapRight(id))}
          className={cn(
            'lift flex min-h-12 w-full items-center gap-2 rounded-md border-2 px-2 py-1 text-start font-display text-lg font-semibold disabled:pointer-events-none',
            n > 0 ? CHOICE_STATE[state === 'idle' ? 'selected' : state] : selected ? 'border-brand bg-brand-soft ring-4 ring-brand/30' : CHOICE_STATE.idle,
          )}
        >
          <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold', n > 0 ? 'border-brand bg-brand text-brand-fg' : 'border-line text-transparent')}>
            {n || '0'}
          </span>
          <span className="min-w-0 flex-1 leading-tight">{label}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        {pick ? t('matchPickRight') : t('matchPickLeft')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ul aria-label={t('leftColumn')} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {left.map((l) => cell(l.id, l.text, 0))}
        </ul>
        <ul aria-label={t('rightColumn')} className="m-0 flex list-none flex-col gap-1.5 p-0">
          {right.map((r) => cell(r.id, r.text, 1))}
        </ul>
      </div>
      {!locked && (
        <Button size="lg" fullWidth disabled={pairs.length !== left.length} onClick={() => onSubmit(pairs)}>
          {t('check')}
        </Button>
      )}
    </div>
  );
}
