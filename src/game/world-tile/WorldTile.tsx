'use client';
import { memo } from 'react';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import type { World } from '@/data/api/types';
import { WORLD_BG } from '@/game/illustration-frame';
import { WorldScene } from '@/game/world-scene';
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
        play('select');
        onSelect(world);
      }}
      className={cn(
        'lift group relative flex flex-col items-center justify-end overflow-hidden rounded-lg border-4 text-white shadow-2',
        WORLD_BG[world.id],
        selected ? 'border-fg' : 'border-transparent',
        size === 'lg' ? 'aspect-square w-full max-w-48' : 'aspect-square w-full max-w-32',
      )}
    >
      <span aria-hidden className="absolute inset-0 transition-transform duration-[var(--dur-3)] ease-[var(--ease-spring)] group-hover:scale-110 group-focus-visible:scale-110">
        <WorldScene world={world.id} variant="tile" />
      </span>
      <span className="relative flex w-full items-center justify-center gap-1 bg-black/55 px-2 py-2 font-display text-base font-bold">
        {selected && <Icon name="check" size={18} />}
        {world.name}
      </span>
    </button>
  );
}

/** Memoized tile of a world on the map with its progress. */
export const WorldTile = memo(WorldTileBase);
