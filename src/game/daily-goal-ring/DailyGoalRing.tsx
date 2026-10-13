'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';

export type DailyGoalRingProps = { done: number; target: number; className?: string };

const R = 44;
const C = 2 * Math.PI * R;

export function DailyGoalRing({ done, target, className }: DailyGoalRingProps) {
  const t = useTranslations('game.dailyGoalRing');
  const met = target > 0 && done >= target;
  const full = target > 0 ? Math.min(done / target, 1) : 0;
  // Starts empty, then fills on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const ratio = mounted ? full : 0;
  return (
    <div
      role="img"
      aria-label={met ? t('met') : t('label', { done, target })}
      className={cn('relative inline-flex size-28 items-center justify-center', 'nx-pop', met && 'nx-heart', className)}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-sunken" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          className={cn(met ? 'stroke-success' : 'stroke-brand')}
          style={{ transition: 'stroke-dashoffset var(--dur-4) var(--ease-out)' }}
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center font-display font-bold text-fg">
        {met ? (
          <Icon name="check" size={36} className="text-success" />
        ) : (
          <span className="text-2xl">
            {done}/{target}
          </span>
        )}
      </span>
    </div>
  );
}
