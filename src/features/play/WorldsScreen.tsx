'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useWorlds } from '@/features/api/hooks';
import { WorldTile } from '@/game/world-tile';
import { Reveal } from '@/ui/reveal';
import { Skeleton } from '@/ui/skeleton';

export function WorldsScreen() {
  const t = useTranslations('screens.play.worlds');
  const router = useRouter();
  const worlds = useWorlds();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-6 font-display text-4xl font-bold">{t('title')}</h1>
      {worlds.isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={180} />
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(worlds.data ?? []).map((w, i) => (
          <li key={w.id}>
            <Reveal delayMs={60 * i}>
              <WorldTile world={w} size="lg" onSelect={(world) => router.push(`/play/journey/${world.id}`)} />
            </Reveal>
          </li>
        ))}
      </ul>
    </main>
  );
}
