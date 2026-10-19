import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { Icon, type IconName } from '@/ui/icon';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  /** What to do next: one button or link. An empty state without a next step is only decoration. */
  action?: ReactNode;
  /** compact sits inside a card; page fills a screen. */
  size?: 'compact' | 'page';
  className?: string;
};

/** Friendly "nothing here yet": a soft icon badge, one line of why, one next step. */
export function EmptyState({ icon, title, description, action, size = 'compact', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 text-center', size === 'page' ? 'py-16' : 'py-6', className)}>
      <span aria-hidden className="relative flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand shadow-1">
        <span className="nx-sparkle absolute -end-1 -top-1 text-lg">✦</span>
        <Icon name={icon} size={36} />
      </span>
      <h3 className="font-display text-xl font-semibold text-fg">{title}</h3>
      {description && <p className="max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
