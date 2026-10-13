'use client';
import Link from 'next/link';
import { useSubscription } from '@/features/api/platform-hooks';
import { SubscriptionBadge, type SubscriptionBadgeProps } from '@/game/subscription-badge';
import { daysUntil } from '@/lib/notify';

/** The parent's subscription status as a badge. With `href` it links to the manage screen. */
export function SubscriptionPill({ variant = 'menu', href = '/parent/subscription' }: { variant?: SubscriptionBadgeProps['variant']; href?: string | null }) {
  const sub = useSubscription();
  if (!sub.data) return null;
  const s = sub.data;
  const badge = (
    <SubscriptionBadge
      status={s.status}
      variant={variant}
      size="sm"
      daysLeft={s.status === 'trial' && s.trial_ends_at ? Math.max(0, daysUntil(s.trial_ends_at, new Date())) : undefined}
      date={s.renews_at ?? undefined}
    />
  );
  return href ? (
    <Link href={href} className="lift inline-flex min-h-11 min-w-11 items-center justify-center rounded-full">
      {badge}
    </Link>
  ) : (
    badge
  );
}
