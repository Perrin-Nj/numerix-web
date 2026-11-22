'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useChildSettings, useHome, useJourney, useSessionStatus, useWorlds } from '@/data/hooks';
import { WorldCard } from '@/game/world-card';
import { MascotBubble } from '@/game/mascot-bubble';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import type { World } from '@/data/api/types';

/** A card that asks for its path only once it scrolls near the screen, so 20 worlds never mean 20 requests at once. */
function LiveCard({ world, childId, locked, suggested, priority, onSelect }: { world: World; childId: string | null; locked: boolean; suggested: boolean; priority: boolean; onSelect: (w: World) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(priority);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const journey = useJourney(near && !locked ? childId : null, world.id);
  const nodes = journey.data?.nodes;
  const progress = nodes && nodes.length > 0 ? nodes.filter((n) => n.state === 'mastered').length / nodes.length : null;
  return (
    <div ref={ref}>
      <WorldCard world={world} locked={locked} suggested={suggested} priority={priority} progress={progress} onSelect={onSelect} />
    </div>
  );
}

/** A grid of the worlds this child can play. */
function WorldGrid({ worlds, childId, suggested, onOpen }: { worlds: World[]; childId: string | null; suggested?: string; onOpen: (w: World) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {worlds.map((w, i) => (
        <li key={w.id}>
          <Reveal delayMs={Math.min(i, 8) * 40}>
            <LiveCard world={w} childId={childId} locked={false} suggested={suggested === w.id} priority={i < 4} onSelect={onOpen} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** World map: one photo card per world, with lock and progress ring. */
export function WorldsScreen() {
  const t = useTranslations('screens.play.worlds');
  const router = useRouter();
  const worlds = useWorlds();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const settings = useChildSettings(childId ?? '');
  const home = useHome(childId);
  const enabled = settings.data?.enabled_worlds;
  const all = worlds.data ?? [];
  // Only the worlds enabled for this child: no locked wall, no hint of the others. Nothing is drawn until the settings arrive.
  const list = enabled ? all.filter((w) => enabled.includes(w.id)) : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-3 font-display text-4xl font-bold">{t('title')}</h1>
      <MascotBubble size="sm" pose="wave" className="mb-5">
        {t('guide')}
      </MascotBubble>
      <ScreenState
        isLoading={worlds.isLoading || settings.isLoading}
        error={worlds.error ?? settings.error}
        isEmpty={Boolean(worlds.data) && Boolean(enabled) && list.length === 0}
        onRetry={() => void (worlds.error ? worlds.refetch() : settings.refetch())}
        area="play"
        skeleton={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={220} />
            ))}
          </div>
        }
      >
        <WorldGrid worlds={list} childId={childId} suggested={home.data?.suggested.world} onOpen={(w) => router.push(`/play/journey/${w.id}`)} />
      </ScreenState>
    </main>
  );
}
