'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import type { WorldId } from '@/lib/api/types';
import { WORLD_BG, WORLD_EMOJI } from '@/game/illustration-frame';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type ContinueCardProps = {
  label: string;
  world: WorldId;
  hasOpenSession: boolean;
  onContinue: () => void;
};

/** The one primary action of the home feed. */
export function ContinueCard({ label, world, hasOpenSession, onContinue }: ContinueCardProps) {
  const t = useTranslations('game.continueCard');
  return (
    <section
      aria-label={t('region')}
      className="flex flex-col gap-4 rounded-lg border-2 border-line bg-elevated p-4 shadow-2 sm:flex-row sm:items-center sm:p-6"
    >
      <span
        aria-hidden
        className={cn('flex size-24 shrink-0 items-center justify-center rounded-md text-6xl', WORLD_BG[world])}
      >
        {WORLD_EMOJI[world]}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-muted">{hasOpenSession ? t('resume') : t('start')}</p>
        <p className="font-display text-2xl font-bold text-fg">{label}</p>
      </div>
      <Button size="xl" sound="maximize" iconLeft={<Icon name="play" size={24} />} onClick={onContinue}>
        {hasOpenSession ? t('resumeAction') : t('startAction')}
      </Button>
    </section>
  );
}
