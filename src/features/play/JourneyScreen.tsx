'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useJourney, useSessionStatus, useWorlds } from '@/data/hooks';
import { useStartChapter } from './useStartChapter';
import { JourneyPath } from '@/game/journey-path';
import { WorldHero } from '@/game/world-hero';
import { MascotBubble } from '@/game/mascot-bubble';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { WORLD_IDS, type World, type WorldId } from '@/data/api/types';

/** World page: parallax photo header, owl guide and the quests on a winding path. */
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
  const found = worlds.data?.find((x) => x.id === w);
  // Until the catalogue arrives the header still has a name and the accent falls back to the brand colour
  const hero: World = found ?? { id: w, name: tw(w), tagline: '', image_url: '', accent_color: '#6b7cff', skill_count: 0 };
  const empty = Boolean(journey.data) && journey.data!.nodes.length === 0;

  return (
    <main className="mx-auto w-full max-w-2xl pb-4 lg:max-w-4xl">
      <WorldHero
        world={hero}
        top={<IconButton label={t('back')} variant="ghost" sound="back" icon={<Icon name="chevron-left" />} onClick={() => router.push('/play/worlds')} className="bg-black/40 text-white hover:bg-black/55" />}
      />
      <div className="px-4 py-4">
        {!valid && <p className="text-muted">{t('unknownWorld')}</p>}
        {!empty && <MascotBubble size="sm" pose="wave" className="mb-4">{t('guide')}</MascotBubble>}
        <ScreenState
          isLoading={status.isLoading || journey.isLoading}
          error={status.error ?? journey.error}
          isEmpty={empty}
          empty={<p className="rounded-lg bg-sunken p-4 text-lg">{t('empty')}</p>}
          onRetry={() => void (status.error ? status.refetch() : journey.refetch())}
          area="play"
          skeleton={<Skeleton height={420} />}
        >
          {journey.data && (
            <JourneyPath
              nodes={journey.data.nodes}
              world={w}
              accent={found?.accent_color}
              scenes={found?.scenes}
              currentSkillId={journey.data.current_skill_id}
              onSelectNode={(node) => begin(w, { skillId: node.skill_id })}
              onPlay={() => begin(w, { skillId: journey.data?.current_skill_id })}
            />
          )}
        </ScreenState>
      </div>
      {dialog}
    </main>
  );
}
