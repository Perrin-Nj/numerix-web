'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useJourney, useSessionStatus, useWorlds } from '@/features/api/hooks';
import { useStartChapter } from './useStartChapter';
import { JourneyPath } from '@/game/journey-path';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { Skeleton } from '@/ui/skeleton';
import { WORLD_IDS, type WorldId } from '@/lib/api/types';

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
        <IconButton label={t('back')} variant="ghost" icon={<Icon name="chevron-left" />} onClick={() => router.push('/play/worlds')} />
        <h1 className="font-display text-3xl font-bold">{tw(w)}</h1>
      </div>
      {!valid && <p className="text-muted">{t('unknownWorld')}</p>}
      {journey.isLoading && <Skeleton height={420} />}
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
      {dialog}
    </main>
  );
}
