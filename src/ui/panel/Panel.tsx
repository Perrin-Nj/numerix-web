import { useId, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';

const panel = cva('rounded-lg border text-fg', {
  variants: {
    tone: {
      plain: 'border-line bg-elevated shadow-1',
      brand: 'border-brand bg-brand-soft',
      sunken: 'border-line bg-sunken',
    },
    padded: { true: 'p-5', false: '' },
  },
  defaultVariants: { tone: 'plain', padded: true },
});

export type PanelProps = Omit<HTMLAttributes<HTMLElement>, 'title'> &
  VariantProps<typeof panel> & { title?: string };

export function Panel({ title, tone, padded, className, children, ...rest }: PanelProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={title ? titleId : undefined} className={cn(panel({ tone, padded }), className)} {...rest}>
      {title && (
        <h2 id={titleId} className={cn('font-display text-xl font-semibold', padded === false ? 'p-5 pb-0' : 'mb-3')}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
