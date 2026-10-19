'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';

export type LessonProgressProps = {
  /** Questions finished so far. */
  done: number;
  /** Planned questions of the chapter. */
  total: number;
  className?: string;
};

/**
 * Thin chapter bar for the top of the play screen. It fills with a spring-like ease when a question is finished.
 * No number, no score and no timer is drawn: it only shows how far the story has come. Reads as a progressbar for
 * screen readers.
 */
export function LessonProgress({ done, total, className }: LessonProgressProps) {
  const t = useTranslations('game.lessonProgress');
  const reduced = useReducedMotion();
  const safe = Math.max(total, 1);
  const frac = Math.max(0, Math.min(1, done / safe));
  return (
    <div
      role="progressbar"
      aria-label={t('label')}
      aria-valuemin={0}
      aria-valuemax={safe}
      aria-valuenow={Math.min(done, safe)}
      aria-valuetext={t('text', { done: Math.min(done + 1, safe), total: safe })}
      className={cn('relative h-3 w-full overflow-hidden rounded-full border border-line bg-sunken', className)}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left rounded-full bg-brand [background-image:var(--brand-grad)]"
        style={{
          transform: `scaleX(${frac})`,
          transition: reduced ? 'none' : 'transform 600ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
      >
        {/* a soft highlight on the fill, like a lesson bar in a language app */}
        <span className="absolute inset-x-2 top-0.5 h-0.5 rounded-full bg-white/40" />
      </span>
    </div>
  );
}
