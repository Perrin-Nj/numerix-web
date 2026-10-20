'use client';
import { useId } from 'react';
import { Select as S } from 'radix-ui';
import { useSound } from '@/platform/audio';
import { Icon } from '@/ui/icon';

export type SelectOption = { value: string; label: string };
export type SelectProps = {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
};

/** Labelled select list (Radix) for a short list of options. */
export function Select({ options, value, onValueChange, placeholder, label, disabled }: SelectProps) {
  const labelId = useId();
  const { play } = useSound();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="font-display font-semibold text-fg">
        {label}
      </span>
      <S.Root
        value={value}
        onValueChange={(v) => {
          play('select');
          onValueChange(v);
        }}
        onOpenChange={(o) => o && play('select')}
        disabled={disabled}
      >
        <S.Trigger
          aria-labelledby={labelId}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-md border border-line-input bg-elevated px-4 text-left text-base text-fg data-[placeholder]:text-muted disabled:opacity-50"
        >
          <S.Value placeholder={placeholder} />
          <S.Icon>
            <Icon name="chevron-right" className="rotate-90" />
          </S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content
            position="popper"
            sideOffset={6}
            className="nx-pop z-50 max-h-80 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border-2 border-line bg-elevated text-fg shadow-3"
          >
            <S.Viewport className="p-1">
              {options.map((o) => (
                <S.Item
                  key={o.value}
                  value={o.value}
                  className="flex min-h-12 cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-3 data-[highlighted]:bg-brand-soft data-[highlighted]:outline-none data-[state=checked]:font-semibold"
                >
                  <S.ItemText>{o.label}</S.ItemText>
                  <S.ItemIndicator>
                    <Icon name="check" />
                  </S.ItemIndicator>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </S.Portal>
      </S.Root>
    </div>
  );
}
