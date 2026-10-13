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
        'min-h-12 w-full rounded-md border-2 bg-elevated px-4 text-base text-fg placeholder:text-muted disabled:opacity-50',
        invalid ? 'border-danger' : 'border-line',
        className,
      )}
      {...rest}
    />
  );
});
