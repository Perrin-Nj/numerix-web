'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Icon } from '@/ui/icon';
import { CHOICE_STATE, type ChoiceState } from '@/game/choice-button';
import type { InputProps } from './kind';

/** Two big buttons. The answer is a boolean. */
export function TrueFalse({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const t = useTranslations('game.questionInput');
  const { play } = useSound();
  return (
    <div role="group" aria-label={question.prompt ?? question.math_text} className="grid grid-cols-2 gap-2 md:gap-3">
      {[true, false].map((v) => {
        const state: ChoiceState =
          phase === 'question' ? 'idle' : chosen === v ? (phase === 'outcome' ? (outcome === 'correct' ? 'success' : 'miss') : 'selected') : 'locked';
        return (
          <button
            key={String(v)}
            type="button"
            disabled={phase !== 'question'}
            data-state={state}
            aria-pressed={state === 'selected' || state === 'success'}
            onClick={() => {
              play('select');
              onSubmit(v);
            }}
            className={cn(
              'lift flex min-h-[4.5rem] items-center justify-center gap-2 rounded-md border px-3 font-display text-2xl font-bold disabled:pointer-events-none',
              CHOICE_STATE[state],
            )}
          >
            <Icon name={v ? 'check' : 'x'} size={28} />
            {v ? t('true') : t('false')}
          </button>
        );
      })}
    </div>
  );
}
