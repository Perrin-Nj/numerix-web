'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { InlineError } from '@/ui/inline-error';

export type PinInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label: string;
  keypad?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** Numeric PIN entry with one box per digit. */
export function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  label,
  keypad = true,
}: PinInputProps) {
  const t = useTranslations('ui.pinInput');
  const id = useId();
  const { play } = useSound();
  const errorId = `${id}-error`;

  const update = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    if (clean === value) return;
    onChange(clean);
    if (clean.length === length) {
      play('confirm');
      onComplete?.(clean);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="group relative">
        {/* One real input holds focus, paste and the OS keyboard; the cells below only display it. */}
        <input
          id={id}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          disabled={disabled}
          value={value}
          onChange={(e) => update(e.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className="flex gap-3" aria-hidden>
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex size-14 items-center justify-center rounded-md border-2 bg-elevated font-display text-3xl font-semibold text-fg',
                error ? 'border-danger' : 'border-line-input',
                !disabled && i === Math.min(value.length, length - 1) && 'group-focus-within:border-focus group-focus-within:ring-2 group-focus-within:ring-focus',
                disabled && 'opacity-50',
              )}
            >
              {value[i] ? '●' : ''}
            </span>
          ))}
        </div>
      </div>

      {error && <InlineError id={errorId} message={error} />}

      {keypad && (
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k) => (
            <Button
              key={k}
              variant="secondary"
              size="lg"
              disabled={disabled}
              className="min-w-16 text-2xl"
              onClick={() => update(value + k)}
            >
              {k}
            </Button>
          ))}
          <span aria-hidden />
          <Button variant="secondary" size="lg" disabled={disabled} className="min-w-16 text-2xl" onClick={() => update(value + '0')}>
            0
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={disabled || value.length === 0}
            aria-label={t('backspace')}
            onClick={() => onChange(value.slice(0, -1))}
          >
            <Icon name="chevron-left" size={28} />
          </Button>
        </div>
      )}
    </div>
  );
}
