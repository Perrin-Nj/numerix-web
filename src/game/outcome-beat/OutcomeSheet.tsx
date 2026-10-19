'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { HumanAvatar } from '@/game/human-avatar';
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
  /** Hero name, drawn as a Peeps person. */
  hero: string;
  /** 0 to 3: right answers in a row, shown only as a growing glow around the hero. */
  glow?: number;
  continueLabel: string;
  /** False while the consequence text is still arriving. */
  canContinue?: boolean;
  onContinue: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  className?: string;
};

/** Bottom sheet (max 40 percent of the height) that slides up after an answer. Never red, no score. */
export function OutcomeSheet({ right, line, detail, explain, hero, glow = 0, continueLabel, canContinue = true, onContinue, collapsed, onCollapsedChange, className }: OutcomeSheetProps) {
  const t = useTranslations('game.outcomeSheet');
  return (
    <div
      role="region"
      aria-label={line}
      data-outcome-sheet=""
      className={cn(
        'nx-sheet-up fixed inset-x-0 bottom-0 z-20 mx-auto flex max-h-[40dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-2 border-b-0 border-line bg-elevated pb-[env(safe-area-inset-bottom)] shadow-3',
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
        <div className="flex min-h-0 flex-col gap-3 px-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="nx-hero-glow shrink-0" style={{ '--glow': Math.min(glow, 3) } as React.CSSProperties}>
              <HumanAvatar seed={hero} size={56} mood={right ? 'happy' : 'sad'} />
            </span>
            <Mascot pose={right ? 'cheer' : 'think'} size="sm" decorative />
            <p className="min-w-0 flex-1 font-display text-lg font-bold text-fg">{line}</p>
          </div>
          {(detail || explain) && (
            <div className="nx-rise flex max-h-[14dvh] flex-col gap-1 overflow-y-auto rounded-md bg-sunken p-3 text-base text-fg">
              {detail && <p>{detail}</p>}
              {explain && <p className="text-muted">{explain}</p>}
            </div>
          )}
          <Button size="xl" fullWidth disabled={!canContinue} onClick={onContinue}>
            {continueLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
