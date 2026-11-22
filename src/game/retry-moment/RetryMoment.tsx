'use client';
import { useTranslations } from 'next-intl';
import { MascotBubble } from '@/game/mascot-bubble';
import { cn } from '@/shared/cn';

export type RetryMomentProps = {
  /** The nudge from the hint endpoint (kind retry_hint). Never the answer. Falls back to a calm line while it loads or fails. */
  hint?: string | null;
  className?: string;
};

/**
 * The kind moment after a first answer that was not right: Numa says there is one more go, with a small nudge.
 * No red, no "wrong", no timer. Numa thinks, so the soft `question` sound plays once when it appears.
 */
export function RetryMoment({ hint, className }: RetryMomentProps) {
  const t = useTranslations('game.retryMoment');
  return (
    <div role="status" aria-live="polite" data-retry-moment="" className={cn('nx-rise', className)}>
      <MascotBubble size="sm" pose="think">
        <p className="font-bold">{t('lead')}</p>
        <p className="mt-1 text-fg">{hint ?? t('fallback')}</p>
      </MascotBubble>
    </div>
  );
}
