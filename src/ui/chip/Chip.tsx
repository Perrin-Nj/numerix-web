import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';
import { Icon, type IconName } from '@/ui/icon';

const chip = cva('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold', {
  variants: {
    tone: {
      neutral: 'border-line bg-sunken text-muted',
      success: 'border-transparent bg-success-soft text-success',
      warning: 'border-transparent bg-warning-soft text-warning',
      info: 'border-transparent bg-info-soft text-info',
      brand: 'border-transparent bg-brand-soft text-brand',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type ChipProps = VariantProps<typeof chip> & { icon?: IconName; children: ReactNode; className?: string };

/** Small status pill: icon plus short text. Colour is never the only signal, the text always says it. */
export function Chip({ tone, icon, children, className }: ChipProps) {
  return (
    <span className={cn(chip({ tone }), className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
