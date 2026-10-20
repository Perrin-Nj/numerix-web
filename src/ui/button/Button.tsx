'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { useSound, type SoundName } from '@/platform/audio';

// Soft and modern: solid or gently graded fill, light shadow, no outline or ledge. Pressed = a touch smaller and flatter.
const button = cva(
  'relative inline-flex select-none items-center justify-center gap-2 rounded-md font-display font-semibold transition-[transform,box-shadow,background-color,filter] duration-[var(--dur-1)] ease-[var(--ease-out)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  {
    variants: {
      variant: {
        primary:
          'nx-shine overflow-hidden bg-brand [background-image:var(--brand-grad)] text-brand-fg shadow-[var(--shadow-press)] hover:brightness-110 hover:shadow-2 active:scale-[0.97] active:brightness-95 active:shadow-1',
        secondary:
          'bg-brand-soft text-brand-strong shadow-[var(--shadow-press-neutral)] hover:brightness-95 active:scale-[0.97] active:brightness-90',
        ghost: 'bg-transparent text-fg hover:bg-sunken active:bg-brand-soft',
        danger:
          'bg-danger text-brand-fg shadow-[var(--shadow-press-danger)] hover:brightness-110 active:scale-[0.97] active:brightness-95',
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
