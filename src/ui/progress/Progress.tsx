'use client';
import { Progress as P } from 'radix-ui';

export type ProgressProps = { value: number; max: number; label: string };

export function Progress({ value, max, label }: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-fg">{label}</span>
        <span className="text-muted">
          {value} / {max}
        </span>
      </div>
      <P.Root
        value={value}
        max={safeMax}
        aria-label={label}
        className="h-3 w-full overflow-hidden rounded-full border border-line bg-sunken"
      >
        <P.Indicator
          className="h-full rounded-full bg-brand transition-[width] duration-[var(--dur-3)] ease-[var(--ease-out)]"
          style={{ width: `${pct}%` }}
        />
      </P.Root>
    </div>
  );
}
