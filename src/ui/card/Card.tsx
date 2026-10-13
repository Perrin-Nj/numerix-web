import type { HTMLAttributes } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';

const card = cva('block rounded-lg text-fg', {
  variants: {
    tone: {
      plain: 'border border-line bg-elevated shadow-1',
      brand: 'border border-brand bg-brand-soft',
      sunken: 'border border-line bg-sunken',
    },
    interactive: { true: 'lift lift-tilt cursor-pointer text-left', false: '' },
  },
  defaultVariants: { tone: 'plain', interactive: false },
});

export type CardProps = HTMLAttributes<HTMLElement> &
  Pick<VariantProps<typeof card>, 'tone'> & {
    interactive?: boolean;
    /** Render as the child element (button, anchor). */
    asChild?: boolean;
  };

export function Card({ tone, interactive, asChild, className, ...rest }: CardProps) {
  const Comp = asChild ? Slot.Root : 'div';
  return <Comp className={cn(card({ tone, interactive: !!interactive }), className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 font-display text-lg font-semibold', className)} {...rest} />;
}
export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...rest} />;
}
export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 px-5 pb-5', className)} {...rest} />;
}
