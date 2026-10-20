'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { Mascot } from '@/game/mascot';
import { Button } from '@/ui/button';

export type OutcomeSheetProps = {
  right: boolean;
  /** One short line, already picked from the line pools. */
  line: string;
  /** Kind note written for the typical error the child made. */
  detail?: string;
  /** How to solve it, shown after the answer only. */
  explain?: string;
  /** 0 to 3: right answers in a row, shown only as a growing glow around Numa. */
  glow?: number;
  continueLabel: string;
  /** False while the consequence text is still arriving. */
  canContinue?: boolean;
  onContinue: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  className?: string;
};

/**
 * Phone: bottom sheet (max 50 percent of the height) that slides up after an answer; it publishes its height as
 * --nx-sheet-h so the page keeps room under the question. Desktop (lg): docked in the flow under the question.
 * Never red, no score.
 */
export function OutcomeSheet({ right, line, detail, explain, glow = 0, continueLabel, canContinue = true, onContinue, collapsed, onCollapsedChange, className }: OutcomeSheetProps) {
  const t = useTranslations('game.outcomeSheet');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty('--nx-sheet-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--nx-sheet-h');
    };
  }, []);
  return (
    <div
      ref={ref}
      role="region"
      aria-label={line}
      data-outcome-sheet=""
      className={cn(
        'nx-sheet-up fixed inset-x-0 bottom-0 z-20 mx-auto flex max-h-[50dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-2 border-b-0 border-line bg-elevated pb-[env(safe-area-inset-bottom)] shadow-3 lg:static lg:z-auto lg:mx-0 lg:mt-2 lg:max-h-none lg:max-w-none lg:rounded-2xl lg:border-b-2 lg:pb-0 lg:shadow-2',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => onCollapsedChange(!collapsed)}
        className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 text-base font-semibold text-muted"
      >
        <span aria-hidden className="h-1 w-8 rounded-full bg-line" />
        {collapsed ? t('reopen') : t('review')}
      </button>
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <div className="flex shrink-0 items-center gap-3">
            <span data-outcome-mascot={right ? 'happy' : 'sad'} className="nx-hero-glow shrink-0" style={{ '--glow': Math.min(glow, 3) } as React.CSSProperties}>
              <Mascot pose={right ? 'cheer' : 'think'} size="sm" decorative />
            </span>
            <p className="min-w-0 flex-1 font-display text-lg font-bold text-fg">{line}</p>
          </div>
          {(detail || explain) && (
            <div className="nx-rise flex min-h-12 flex-col gap-1 overflow-y-auto rounded-md bg-sunken p-3 text-base text-fg">
              {detail && <p>{detail}</p>}
              {explain && <p className="text-muted">{explain}</p>}
            </div>
          )}
          <Button size="xl" fullWidth className="shrink-0" disabled={!canContinue} onClick={onContinue}>
            {continueLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
