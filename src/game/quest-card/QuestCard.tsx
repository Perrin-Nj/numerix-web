'use client';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import type { DailyQuest } from '@/lib/api/types';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type QuestCardProps = { quest: DailyQuest; onPlay: () => void };

export function QuestCard({ quest, onPlay }: QuestCardProps) {
  const t = useTranslations('game.questCard');
  const state = quest.completed ? 'completed' : quest.available ? 'available' : 'unavailable';
  return (
    <section
      aria-labelledby="quest-title"
      className={cn(
        'flex items-center gap-4 rounded-lg border-2 p-4 shadow-1',
        state === 'available' ? 'border-brand bg-brand-soft' : 'border-line bg-elevated',
      )}
    >
      <span
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sunken text-fg"
      >
        <Icon name={state === 'completed' ? 'check' : state === 'available' ? 'sparkles' : 'moon'} size={28} />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <h3 id="quest-title" className="font-display text-xl font-bold text-fg">
          {t('title')}
        </h3>
        <p className="text-base text-muted">{t(state)}</p>
      </div>
      {state === 'available' && (
        <Button size="lg" sound="maximize" onClick={onPlay}>
          {t('play')}
        </Button>
      )}
    </section>
  );
}
