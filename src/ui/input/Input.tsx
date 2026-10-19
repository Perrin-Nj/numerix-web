import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-12 w-full rounded-md border-2 bg-elevated px-4 text-base text-fg shadow-[inset_0_2px_0_rgb(0_0_0/0.04)] transition-colors placeholder:text-muted focus-visible:border-brand disabled:opacity-50',
        invalid ? 'border-danger' : 'border-line-input',
        className,
      )}
      {...rest}
    />
  );
});
