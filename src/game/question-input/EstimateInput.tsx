'use client';
import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Button } from '@/ui/button';
import { CHOICE_STATE } from '@/game/choice-button';
import { estimateRange, type InputProps } from './kind';

/** Estimation: a big slider over the range of the number line. The value stays unset until the child touches it. */
export function EstimateInput({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const t = useTranslations('game.questionInput');
  const nf = new Intl.NumberFormat(useLocale());
  const id = useId();
  const range = estimateRange(question) ?? { min: 0, max: 100, step: 1 };
  const [value, setValue] = useState<number | null>(null);
  const locked = phase !== 'question';
  const shown = locked && typeof chosen === 'number' ? chosen : value;
  const state = phase === 'question' ? 'idle' : phase === 'answering' ? 'selected' : outcome === 'correct' ? 'success' : 'miss';
  return (
    <div className="flex flex-col gap-3">
      <output htmlFor={id} aria-live="polite" className={cn('flex min-h-12 items-center justify-center rounded-md border-2 font-display text-3xl font-bold tabular-nums', CHOICE_STATE[state])}>
        {shown === null ? <span className="text-muted">?</span> : nf.format(shown)}
      </output>
      <input
        id={id}
        type="range"
        aria-label={t('estimate')}
        min={range.min}
        max={range.max}
        step={range.step}
        disabled={locked}
        value={shown ?? Math.round((range.min + range.max) / 2)}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerDown={(e) => {
          // A tap on the track sets the value at once
          if (value === null) setValue(Number((e.currentTarget as HTMLInputElement).value));
        }}
        className="h-11 w-full cursor-pointer accent-brand disabled:opacity-60"
      />
      <div className="flex justify-between text-sm text-muted" aria-hidden>
        <span>{nf.format(range.min)}</span>
        <span>{nf.format(range.max)}</span>
      </div>
      {!locked && (
        <Button size="lg" fullWidth disabled={value === null} onClick={() => value !== null && onSubmit(value)}>
          {t('check')}
        </Button>
      )}
    </div>
  );
}
