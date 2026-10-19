'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { InlineError } from '@/ui/inline-error';

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** The control. Give it aria-describedby using `${htmlFor}-hint` and `${htmlFor}-error`. */
  children: ReactNode;
};

/** Label, hint and error message wired to one input by id. */
export function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps) {
  const t = useTranslations('ui.formField');
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-display font-semibold text-fg">
        {label}
        {required && (
          <>
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
            <span className="sr-only"> ({t('required')})</span>
          </>
        )}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && <InlineError id={`${htmlFor}-error`} message={error} />}
    </div>
  );
}
