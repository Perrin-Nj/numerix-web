'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import { Tooltip } from '@/ui/tooltip';

const iconButton = cva(
  'lift inline-flex shrink-0 select-none items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg shadow-press active:translate-y-1 active:shadow-none',
        secondary: 'border-2 border-line bg-elevated text-fg',
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
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant, size, className, onClick, tooltip = true, type = 'button', ...rest },
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
        play('tap');
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});
