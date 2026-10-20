'use client';
import { useId } from 'react';
import { Switch as S } from 'radix-ui';
import { useSound } from '@/platform/audio';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

/** On/off switch with a label and optional description. */
export function Switch({ checked, onCheckedChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  const { play } = useSound();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-display font-semibold text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <S.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => {
          play('toggle');
          onCheckedChange(v);
        }}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="relative h-8 w-14 shrink-0 rounded-full before:absolute before:-inset-2 before:content-[''] border border-line-input bg-sunken transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:opacity-50"
      >
        <S.Thumb className="block size-6 translate-x-0.5 rounded-full bg-fg shadow-1 transition-transform duration-[var(--dur-2)] data-[state=checked]:translate-x-6 data-[state=checked]:bg-brand-fg" />
      </S.Root>
    </div>
  );
}
