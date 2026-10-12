'use client';
import { memo } from 'react';
import { cn } from '@/lib/cn';
import { useSound } from '@/lib/audio';
import type { World } from '@/lib/api/types';
import { WORLD_BG, WORLD_EMOJI } from '@/game/illustration-frame';
import { Icon } from '@/ui/icon';

export type WorldTileProps = {
  world: World;
  selected?: boolean;
  onSelect: (world: World) => void;
  size?: 'md' | 'lg';
};

function WorldTileBase({ world, selected = false, onSelect, size = 'md' }: WorldTileProps) {
  const { play } = useSound();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        play('tap');
        onSelect(world);
      }}
      className={cn(
        'lift relative flex flex-col items-center justify-end overflow-hidden rounded-lg border-4 text-white shadow-2',
        WORLD_BG[world.id],
        selected ? 'border-fg' : 'border-transparent',
        size === 'lg' ? 'aspect-square w-48' : 'aspect-square w-32',
      )}
    >
      <span aria-hidden className={cn('flex flex-1 items-center justify-center', size === 'lg' ? 'text-7xl' : 'text-5xl')}>
        {WORLD_EMOJI[world.id]}
      </span>
      <span className="flex w-full items-center justify-center gap-1 bg-black/55 px-2 py-2 font-display text-base font-bold">
        {selected && <Icon name="check" size={18} />}
        {world.name}
      </span>
    </button>
  );
}

export const WorldTile = memo(WorldTileBase);
