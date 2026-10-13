'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';

export type StreakBadgeProps = { days: number; className?: string };

/** No loss state: zero days simply reads as a fresh start. */
export function StreakBadge({ days, className }: StreakBadgeProps) {
  const t = useTranslations('game.streakBadge');
  const active = days > 0;
  return (
    <div
      className={cn(
        'nx-pop inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-display font-bold',
        active ? 'border-brand bg-brand-soft text-fg' : 'border-line bg-elevated text-muted',
        className,
      )}
    >
      <Icon name="flame" size={24} className={active ? 'nx-heart text-brand' : undefined} />
      {active && <span className="text-xl">{days}</span>}
      <span className="text-base font-semibold">{active ? t('days', { count: days }) : t('fresh')}</span>
    </div>
  );
}
