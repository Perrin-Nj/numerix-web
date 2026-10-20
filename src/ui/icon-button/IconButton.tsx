'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { useSound, type SoundName } from '@/platform/audio';
import { Tooltip } from '@/ui/tooltip';

const iconButton = cva(
  'lift inline-flex shrink-0 select-none items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg shadow-[var(--shadow-press)] active:scale-95',
        secondary: 'bg-brand-soft text-brand-strong shadow-[var(--shadow-press-neutral)]',
        ghost: 'bg-transparent text-fg hover:bg-sunken',
        danger: 'bg-danger text-brand-fg',
      },
      size: { sm: 'size-10', md: 'size-12', lg: 'size-14' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> &
  VariantProps<typeof iconButton> & {
    /** Accessible name and tooltip text. */
    label: string;
    icon: ReactNode;
    /** Hide the tooltip where it would be noise (for example the close button of a dialog). */
    tooltip?: boolean;
    /** Sound on click. Default `tap`; `null` is silent. */
    sound?: SoundName | null;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant, size, className, onClick, tooltip = true, sound = 'tap', type = 'button', ...rest },
  ref,
) {
  const { play } = useSound();
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(iconButton({ variant, size }), className)}
      onClick={(e) => {
        if (sound) play(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});
