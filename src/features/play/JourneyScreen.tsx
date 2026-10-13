'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useJourney, useSessionStatus, useWorlds } from '@/data/hooks';
import { useStartChapter } from './useStartChapter';
import { JourneyPath } from '@/game/journey-path';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { WORLD_IDS, type WorldId } from '@/data/api/types';

export function JourneyScreen({ world }: { world: string }) {
  const t = useTranslations('screens.play.journey');
  const tw = useTranslations('worlds');
  const router = useRouter();
  const valid = (WORLD_IDS as string[]).includes(world);
  const w = (valid ? world : 'echecs') as WorldId;
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const journey = useJourney(childId, w);
  const worlds = useWorlds();
  const { begin, dialog } = useStartChapter(childId);
  const accent = worlds.data?.find((x) => x.id === w)?.accent_color;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <IconButton label={t('back')} variant="ghost" sound="back" icon={<Icon name="chevron-left" />} onClick={() => router.push('/play/worlds')} />
        <h1 className="font-display text-3xl font-bold">{tw(w)}</h1>
      </div>
      {!valid && <p className="text-muted">{t('unknownWorld')}</p>}
      <ScreenState
        isLoading={status.isLoading || journey.isLoading}
        error={status.error ?? journey.error}
        isEmpty={!journey.data}
        onRetry={() => void (status.error ? status.refetch() : journey.refetch())}
        area="play"
        skeleton={<Skeleton height={420} />}
      >
      {journey.data && (
        <JourneyPath
          nodes={journey.data.nodes}
          world={w}
          accent={accent}
          currentSkillId={journey.data.current_skill_id}
          onSelectNode={(node) => begin(w, { skillId: node.skill_id })}
          onPlay={() => begin(w, { skillId: journey.data?.current_skill_id })}
        />
      )}
      </ScreenState>
      {dialog}
    </main>
  );
}
