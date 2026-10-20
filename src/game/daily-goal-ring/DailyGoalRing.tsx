'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';

export type DailyGoalRingProps = { done: number; target: number; className?: string };

/** Ring that fills as the child completes the daily goal (done of target). */
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
      <span
        aria-hidden
        className="absolute inset-0 rounded-full transition-[background] duration-[var(--dur-4)] motion-reduce:transition-none"
        style={{
          background: `conic-gradient(${met ? 'var(--success)' : 'var(--brand)'} ${ratio * 360}deg, var(--bg-sunken, rgb(0 0 0 / 0.08)) 0)`,
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
        }}
      />
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
