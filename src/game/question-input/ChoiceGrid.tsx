'use client';
import type { CSSProperties } from 'react';
import { ChoiceButton, type ChoiceState } from '@/game/choice-button';
import { cn } from '@/shared/cn';
import type { AnswerValue } from '@/data/api/types';
import type { InputProps } from './kind';

const same = (a: AnswerValue | null, b: AnswerValue) => a !== null && JSON.stringify(a) === JSON.stringify(b);

/** 2 to 5 cards. Long texts go one per row so nothing is cut. */
export function ChoiceGrid({ question, phase, chosen, outcome, onSubmit }: InputProps) {
  const long = question.choices.some((c) => String(c).length > 22);
  return (
    <div role="group" aria-label={question.prompt ?? question.math_text} className={cn('grid gap-2 md:gap-3', long ? 'grid-cols-1' : 'grid-cols-2')}>
      {question.choices.map((c, i) => {
        const state: ChoiceState =
          phase === 'question'
            ? 'idle'
            : same(chosen, c)
              ? phase === 'outcome'
                ? outcome === 'correct'
                  ? 'success'
                  : 'miss'
                : 'selected'
              : 'locked';
        return (
          <div
            key={JSON.stringify(c)}
            className={cn('nx-stagger', !long && question.choices.length % 2 === 1 && i === question.choices.length - 1 && 'col-span-2')}
            style={{ '--i': i } as CSSProperties}
          >
            <ChoiceButton value={c} index={i} shortcut={phase === 'question'} state={state} onSelect={onSubmit} />
          </div>
        );
      })}
    </div>
  );
}
