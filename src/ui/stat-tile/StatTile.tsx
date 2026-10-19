import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { Icon, type IconName } from '@/ui/icon';

export type StatTileProps = {
  label: string;
  value: ReactNode;
  icon?: IconName;
  /** Current and previous numbers: draws two bars and a signed change chip. */
  compare?: { current: number; previous: number; previousLabel: string };
  className?: string;
};

/** One number with a label, an optional icon and an optional before/after comparison. For dashboards. */
export function StatTile({ label, value, icon, compare, className }: StatTileProps) {
  const max = compare ? Math.max(compare.current, compare.previous, 1) : 1;
  const diff = compare ? compare.current - compare.previous : 0;
  const flat = !compare || (compare.current === 0 && compare.previous === 0);
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border-2 border-line bg-sunken p-4', className)}>
      <dt className="flex items-center gap-2 text-sm font-semibold text-muted">
        {icon && (
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name={icon} size={18} />
          </span>
        )}
        {label}
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold leading-none text-fg">{value}</span>
        {compare && diff !== 0 && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-sm font-semibold',
              diff > 0 ? 'bg-success-soft text-success' : 'bg-info-soft text-info',
            )}
          >
            {diff > 0 ? '+' : '-'}
            {Math.abs(diff)}
          </span>
        )}
      </dd>
      {compare && (
        <dd className="flex flex-col gap-1.5" aria-label={`${compare.current} / ${compare.previousLabel} ${compare.previous}`}>
          {!flat && (
            <>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-line">
                <span className="nx-grow-x block h-full rounded-full bg-brand" style={{ width: `${(compare.current / max) * 100}%` }} />
              </span>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-line">
                <span className="nx-grow-x block h-full rounded-full bg-line-strong" style={{ width: `${(compare.previous / max) * 100}%` }} />
              </span>
            </>
          )}
          <span className="text-sm text-muted">{compare.previousLabel}</span>
        </dd>
      )}
    </div>
  );
}
