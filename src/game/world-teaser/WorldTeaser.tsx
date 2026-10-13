'use client';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import type { World } from '@/data/api/types';
import { WORLD_BG } from '@/game/illustration-frame';
import { WorldScene } from '@/game/world-scene';
import { Icon } from '@/ui/icon';

export type WorldTeaserProps = { world: World; onOpen: (world: World) => void };

function WorldTeaserBase({ world, onOpen }: WorldTeaserProps) {
  const t = useTranslations('game.worldTeaser');
  const { play } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        play('select');
        onOpen(world);
      }}
      className="lift lift-tilt group flex w-full items-center gap-4 rounded-lg border-2 border-line bg-elevated p-3 text-start text-fg shadow-1"
    >
      <span
        aria-hidden
        className={cn('size-20 shrink-0 overflow-hidden rounded-md transition-transform duration-[var(--dur-3)] ease-[var(--ease-spring)] group-hover:scale-110 group-focus-visible:scale-110', WORLD_BG[world.id])}
      >
        <WorldScene world={world.id} variant="tile" />
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="font-display text-xl font-bold">{world.name}</span>
        {world.hook && <span className="text-base text-muted">{world.hook}</span>}
        <span className="text-sm font-semibold text-brand">{t('open')}</span>
      </span>
      <Icon name="chevron-right" size={24} />
    </button>
  );
}

export const WorldTeaser = memo(WorldTeaserBase);
