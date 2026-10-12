'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { reportError } from '@/lib/errors/bridge';
import { signOut, useEngagement, useGrowth, useSessionStatus } from '@/features/api/hooks';
import { ParentGate } from '@/features/common/ParentGate';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { StreakBadge } from '@/game/streak-badge';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

export function MeScreen() {
  const t = useTranslations('screens.play.me');
  const router = useRouter();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const engagement = useEngagement(childId);
  const growth = useGrowth(childId);
  const [gate, setGate] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-4xl font-bold">{t('title')}</h1>
      {engagement.isLoading && <Skeleton height={140} />}
      {engagement.data && (
        <Panel title={t('today')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StreakBadge days={engagement.data.streak.current_days} />
            <DailyGoalRing done={engagement.data.daily_goal.done_chapters} target={engagement.data.daily_goal.target_chapters} />
          </div>
          <p className="mt-3 text-muted">{t('longest', { days: engagement.data.streak.longest_days })}</p>
        </Panel>
      )}
      {growth.data && (
        <Panel title={t('growth')}>
          <p className="text-lg">{t('growthLine', { now: growth.data.current.chapters_completed, before: growth.data.previous.chapters_completed })}</p>
          <p className="text-lg">{t('skillsLine', { now: growth.data.current.skills_mastered, before: growth.data.previous.skills_mastered })}</p>
        </Panel>
      )}
      <div>
        <Button variant="secondary" iconLeft={<Icon name="shield" />} onClick={() => setGate(true)}>
          {t('grownUps')}
        </Button>
      </div>
      <ParentGate
        open={gate}
        onOpenChange={setGate}
        onUnlocked={async () => {
          try {
            await signOut('child');
            router.replace('/parent');
            router.refresh();
          } catch (e) {
            reportError(e);
          }
        }}
      />
    </main>
  );
}
