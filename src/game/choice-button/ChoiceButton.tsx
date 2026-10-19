'use client';
import { memo, useEffect, type CSSProperties } from 'react';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { useFormatAnswer } from '@/platform/format';
import { useReducedMotion } from '@/platform/motion';
import type { AnswerValue } from '@/data/api/types';
import { Icon } from '@/ui/icon';

export type ChoiceState = 'idle' | 'selected' | 'locked' | 'success' | 'miss';

export type ChoiceButtonProps = {
  value: AnswerValue;
  /** 0 to 4. Shows the letter A to E and the 1 to 5 key. */
  index: number;
  state: ChoiceState;
  onSelect: (value: AnswerValue) => void;
  shortcut?: boolean;
};

const SPARKS = [['-60px', '-34px'], ['58px', '-38px'], ['-36px', '30px'], ['40px', '34px'], ['0px', '-48px']];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const CHOICE_STATE: Record<ChoiceState, string> = {
  idle: 'border-line bg-elevated text-fg shadow-1',
  selected: 'nx-pop border-brand bg-brand-soft text-fg ring-4 ring-brand/30',
  locked: 'border-line bg-sunken text-muted',
  success: 'nx-choice-right relative border-success bg-elevated text-fg',
  // Warm amber tint, no shake and no dimming: never red, never a punishment. The sheet below explains.
  miss: 'border-warning bg-warning-soft text-fg',
};

function ChoiceButtonBase({ value, index, state, onSelect, shortcut }: ChoiceButtonProps) {
  const { play } = useSound();
  const format = useFormatAnswer();
  const disabled = state === 'locked' || state === 'success' || state === 'miss';
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!shortcut || state !== 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === String(index + 1)) {
        play('select');
        onSelect(value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, state, index, value, onSelect, play]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={state === 'selected' || state === 'success'}
      data-state={state}
      onClick={() => {
        play('select');
        onSelect(value);
      }}
      className={cn(
        // 3.75rem = 60px, 90px at TV scale (html font-size scales)
        'lift relative flex min-h-[3.75rem] w-full items-center gap-2 rounded-md border-2 px-3 py-3 sm:gap-4 sm:px-4 text-start font-display text-xl font-semibold disabled:pointer-events-none',
        CHOICE_STATE[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-8 shrink-0 sm:size-9 items-center justify-center rounded-full border-2 text-base',
          state === 'selected' ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-sunken text-muted',
          state === 'success' && 'border-success bg-success text-bg',
        )}
      >
        {state === 'success' ? <Icon name="check" size={20} /> : LETTERS[index]}
      </span>
      <span className="min-w-0 flex-1">{format(value)}</span>
      {state === 'success' &&
        !reduced &&
        SPARKS.map(([dx, dy], i) => (
          <span key={i} aria-hidden className="nx-spark" style={{ '--dx': dx, '--dy': dy } as CSSProperties}>
            ✨
          </span>
        ))}
    </button>
  );
}

export const ChoiceButton = memo(ChoiceButtonBase);
