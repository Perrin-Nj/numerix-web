'use client';
import { useTranslations } from 'next-intl';
import { useDailyQuest, useHome, useSessionStatus } from '@/features/api/hooks';
import { useStartChapter } from './useStartChapter';
import { MascotBubble } from '@/game/mascot-bubble';
import { QuestCard } from '@/game/quest-card';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/ui/screen-state';

export function QuestScreen() {
  const t = useTranslations('screens.play.quest');
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const quest = useDailyQuest(childId);
  const home = useHome(childId);
  const { begin, dialog } = useStartChapter(childId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
      <MascotBubble pose="think">{t('intro')}</MascotBubble>
      <ScreenState
        isLoading={status.isLoading || quest.isLoading}
        error={status.error ?? quest.error}
        isEmpty={!quest.data}
        onRetry={() => void (status.error ? status.refetch() : quest.refetch())}
        area="play"
        skeleton={<Skeleton height={120} />}
      >
      {quest.data && (
        <QuestCard quest={quest.data} onPlay={() => begin(home.data?.suggested.world ?? 'echecs', { kind: 'daily_quest' })} />
      )}
      </ScreenState>
      {dialog}
    </main>
  );
}
