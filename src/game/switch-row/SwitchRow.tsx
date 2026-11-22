'use client';
import { useId } from 'react';
import { Switch as S } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';

export type SwitchRowProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * One tappable row: the switch sits right beside its label (never at the far edge), the whole row toggles it, and the state is
 * written out (On or Off) under the switch so colour is never the only signal. 48 px tall at least, full width of its container (put rows in a SettingsGrid).
 */
export function SwitchRow({ checked, onCheckedChange, label, description, disabled, className }: SwitchRowProps) {
  const t = useTranslations('game.switchRow');
  const id = useId();
  const { play } = useSound();
  return (
    <label
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 transition-colors',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
        checked ? 'border-brand/50 bg-brand-soft' : 'border-line bg-elevated',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-brand/60',
        className,
      )}
    >
      <span className="flex w-[4.75rem] shrink-0 flex-col items-center gap-0.5">
        <S.Root
          id={id}
          checked={checked}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          aria-describedby={description ? `${id}-desc` : undefined}
          onCheckedChange={(v) => {
            play('toggle');
            onCheckedChange(v);
          }}
          className="relative h-7 w-12 shrink-0 rounded-full border border-line-input bg-sunken transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand"
        >
          <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-fg shadow-1 transition-transform duration-[var(--dur-2)] data-[state=checked]:translate-x-6 data-[state=checked]:bg-brand-fg" />
        </S.Root>
        <span aria-hidden className="text-sm font-semibold text-muted">
          {checked ? t('on') : t('off')}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block font-display font-semibold text-fg">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="block text-sm text-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
