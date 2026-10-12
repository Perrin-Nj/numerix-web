'use client';
import { memo, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import { useFormatAnswer } from '@/lib/format';
import type { AnswerValue } from '@/lib/api/types';
import { Icon } from '@/ui/icon';

export type ChoiceState = 'idle' | 'selected' | 'locked' | 'success';

export type ChoiceButtonProps = {
  value: AnswerValue;
  /** 0 to 3. Shows the letter A to D and the 1 to 4 key. */
  index: number;
  state: ChoiceState;
  onSelect: (value: AnswerValue) => void;
  shortcut?: boolean;
};

const LETTERS = ['A', 'B', 'C', 'D'];

const STATE: Record<ChoiceState, string> = {
  idle: 'border-line bg-elevated text-fg shadow-1',
  selected: 'border-brand bg-brand-soft text-fg ring-4 ring-brand/30',
  locked: 'border-line bg-sunken text-muted',
  success: 'border-success bg-elevated text-fg',
};

function ChoiceButtonBase({ value, index, state, onSelect, shortcut }: ChoiceButtonProps) {
  const { play } = useSound();
  const format = useFormatAnswer();
  const disabled = state === 'locked' || state === 'success';

  useEffect(() => {
    if (!shortcut || state !== 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === String(index + 1)) {
        play('tap');
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
        play('tap');
        onSelect(value);
      }}
      className={cn(
        // 3.75rem = 60px, 90px at TV scale (html font-size scales)
        'lift flex min-h-[3.75rem] w-full items-center gap-4 rounded-md border-2 px-4 py-3 text-start font-display text-xl font-semibold disabled:pointer-events-none',
        STATE[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-base',
          state === 'selected' ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-sunken text-muted',
          state === 'success' && 'border-success bg-success text-bg',
        )}
      >
        {state === 'success' ? <Icon name="check" size={20} /> : LETTERS[index]}
      </span>
      <span className="flex-1">{format(value)}</span>
    </button>
  );
}

export const ChoiceButton = memo(ChoiceButtonBase);
