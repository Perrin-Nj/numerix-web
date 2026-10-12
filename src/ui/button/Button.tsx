'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { useSound, type SoundName } from '@/lib/audio';

const button = cva(
  'lift relative inline-flex select-none items-center justify-center gap-2 rounded-md font-display font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'nx-shine overflow-hidden bg-brand text-brand-fg shadow-press active:translate-y-1.5 active:scale-[0.97] active:shadow-none',
        secondary: 'border-2 border-line bg-elevated text-fg',
        ghost: 'bg-transparent text-fg hover:bg-sunken',
        danger: 'bg-danger text-brand-fg',
      },
      size: {
        sm: 'min-h-11 px-3 text-sm',
        md: 'min-h-12 px-5 text-base',
        lg: 'min-h-14 px-6 text-lg',
        xl: 'min-h-[4.5rem] px-8 text-xl',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    loading?: boolean;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    /** Sound on click. Default `tap`; `null` is silent. */
    sound?: SoundName | null;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading, iconLeft, iconRight, sound = 'tap', className, children, onClick, disabled, type = 'button', ...rest },
  ref,
) {
  const { play } = useSound();
  return (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (sound) play(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});
