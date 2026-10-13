'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useWorlds } from '@/data/hooks';
import { WorldTile } from '@/game/world-tile';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';

export function WorldsScreen() {
  const t = useTranslations('screens.play.worlds');
  const router = useRouter();
  const worlds = useWorlds();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-6 font-display text-4xl font-bold">{t('title')}</h1>
      <ScreenState
        isLoading={worlds.isLoading}
        error={worlds.error}
        isEmpty={Boolean(worlds.data) && worlds.data!.length === 0}
        onRetry={() => void worlds.refetch()}
        area="play"
        skeleton={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={180} />
            ))}
          </div>
        }
      >
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(worlds.data ?? []).map((w, i) => (
          <li key={w.id}>
            <Reveal delayMs={60 * i}>
              <WorldTile world={w} size="lg" onSelect={(world) => router.push(`/play/journey/${world.id}`)} />
            </Reveal>
          </li>
        ))}
      </ul>
      </ScreenState>
    </main>
  );
}
