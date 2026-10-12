'use client';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import type { World } from '@/lib/api/types';
import { WORLD_BG, WORLD_EMOJI } from '@/game/illustration-frame';
import { Icon } from '@/ui/icon';

export type WorldTeaserProps = { world: World; onOpen: (world: World) => void };

function WorldTeaserBase({ world, onOpen }: WorldTeaserProps) {
  const t = useTranslations('game.worldTeaser');
  const { play } = useSound();
  return (
    <button
      type="button"
      onClick={() => {
        play('tap');
        onOpen(world);
      }}
      className="lift flex w-full items-center gap-4 rounded-lg border-2 border-line bg-elevated p-3 text-start text-fg shadow-1"
    >
      <span
        aria-hidden
        className={cn('flex size-20 shrink-0 items-center justify-center rounded-md text-5xl', WORLD_BG[world.id])}
      >
        {WORLD_EMOJI[world.id]}
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
