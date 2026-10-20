import { useId, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { Icon, type IconName } from '@/ui/icon';

const panel = cva('rounded-lg text-fg', {
  variants: {
    tone: {
      plain: 'bg-elevated shadow-2',
      brand: 'border-2 border-brand bg-gradient-to-br from-brand-soft to-elevated',
      sunken: 'border-2 border-line bg-sunken',
    },
    padded: { true: 'p-5', false: '' },
  },
  defaultVariants: { tone: 'plain', padded: true },
});

export type PanelProps = Omit<HTMLAttributes<HTMLElement>, 'title'> &
  VariantProps<typeof panel> & {
    title?: string;
    /** Small tinted icon before the title, so a page of panels scans quickly. */
    icon?: IconName;
  };

/** A titled card section. */
export function Panel({ title, icon, tone, padded, className, children, ...rest }: PanelProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={title ? titleId : undefined} className={cn(panel({ tone, padded }), className)} {...rest}>
      {title && (
        <h2
          id={titleId}
          className={cn('flex items-center gap-3 font-display text-xl font-semibold', padded === false ? 'p-5 pb-0' : 'mb-4')}
        >
          {icon && (
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon name={icon} size={20} />
            </span>
          )}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
