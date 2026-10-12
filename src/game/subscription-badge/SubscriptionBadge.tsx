'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/ui/icon';
import type { SubscriptionStatus } from '@/lib/api/platform-types';

export type SubscriptionBadgeStatus = SubscriptionStatus | 'blocked';

export type SubscriptionBadgeProps = {
  status: SubscriptionBadgeStatus;
  /** Trial: whole days left. */
  daysLeft?: number;
  /** ISO date. Active: next renewal. Canceled: end of access. */
  date?: string;
  size?: 'sm' | 'md';
  /** `menu` is short (status only). `settings` adds the date. */
  variant?: 'menu' | 'settings';
  className?: string;
};

const LOOK: Record<SubscriptionBadgeStatus, { icon: IconName; border: string; color: string }> = {
  trial: { icon: 'gift', border: 'border-info', color: 'text-info' },
  active: { icon: 'check', border: 'border-success', color: 'text-success' },
  unpaid: { icon: 'alert', border: 'border-warning', color: 'text-warning' },
  expired: { icon: 'lock', border: 'border-danger', color: 'text-danger' },
  canceled: { icon: 'x', border: 'border-line', color: 'text-muted' },
  blocked: { icon: 'shield', border: 'border-danger', color: 'text-danger' },
};

/** Status is always icon plus words, never color alone. No sound. */
export function SubscriptionBadge({ status, daysLeft, date, size = 'md', variant = 'settings', className }: SubscriptionBadgeProps) {
  const t = useTranslations('game.subscriptionBadge');
  const format = useFormatter();
  const look = LOOK[status];
  const when = date && variant === 'settings' ? format.dateTime(new Date(date), { dateStyle: 'medium' }) : undefined;

  let label: string;
  if (status === 'trial') label = t('trial', { count: daysLeft ?? 0 });
  else if (status === 'active') label = when ? t('activeUntil', { date: when }) : t('active');
  else if (status === 'canceled') label = when ? t('canceledUntil', { date: when }) : t('canceled');
  else label = t(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 bg-elevated font-display font-semibold text-fg',
        size === 'sm' ? 'min-h-8 px-3 py-0.5 text-sm' : 'min-h-10 px-4 py-1.5 text-base',
        look.border,
        className,
      )}
    >
      <Icon name={look.icon} size={size === 'sm' ? 16 : 20} className={look.color} />
      <span>{label}</span>
    </span>
  );
}
