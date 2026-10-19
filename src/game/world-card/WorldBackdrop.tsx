import { cn } from '@/shared/cn';
import type { WorldId } from '@/data/api/types';
import { WORLD_EMOJI } from '@/game/illustration-frame';

export type WorldBackdropProps = { world: WorldId; accent: string; className?: string };

/** Stand-in when a world has no approved photo yet: a gradient from the accent colour and the world emoji. Never a gap. */
export function WorldBackdrop({ world, accent, className }: WorldBackdropProps) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#6b7cff';
  return (
    <span
      aria-hidden
      className={cn('absolute inset-0 flex items-center justify-center overflow-hidden', className)}
      style={{ background: `linear-gradient(145deg, ${safe} 0%, color-mix(in srgb, ${safe} 55%, #0f172a) 100%)` }}
    >
      <span className="select-none text-7xl opacity-80 drop-shadow">{WORLD_EMOJI[world] ?? '⭐'}</span>
    </span>
  );
}
