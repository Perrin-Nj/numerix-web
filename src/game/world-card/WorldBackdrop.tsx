import type { WorldId } from '@/data/api/types';
import { WorldScene } from '@/game/world-scene';

export type WorldBackdropProps = { world: WorldId; accent?: string; className?: string };

/** Stand-in when the server has no approved photo for a world yet: the bundled real photo of that world. Never a drawing. */
export function WorldBackdrop({ world, className }: WorldBackdropProps) {
  return <WorldScene world={world} variant="hero" className={className ? `absolute inset-0 ${className}` : 'absolute inset-0'} />;
}
