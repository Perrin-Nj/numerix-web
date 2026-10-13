import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/cn';

const container = cva(
  'mx-auto w-full px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8',
  {
    variants: {
      width: { narrow: 'max-w-xl', default: 'max-w-3xl', wide: 'max-w-6xl' },
    },
    defaultVariants: { width: 'default' },
  },
);

export type PageContainerProps = VariantProps<typeof container> & {
  children: ReactNode;
  className?: string;
};

/** Centers page content and keeps it clear of notches and home indicators. */
export function PageContainer({ width, className, children }: PageContainerProps) {
  return <div className={cn(container({ width }), className)}>{children}</div>;
}
