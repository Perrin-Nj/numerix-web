import type { CSSProperties, ReactNode } from 'react';

export const PERSPECTIVE = 900;

/**
 * One depth lane of the rig. `z` in px (negative is far): the lane is pushed back and scaled up by the same factor so it keeps
 * its on-screen size, and parallax (pointer slide, slow lane drift) shows the depth. `par` is how far the lane slides with the
 * pointer (in cqw per unit of pointer offset), `drift` picks one of two slow translate loops (the subject lane never drifts).
 * `lite={false}` drops the lane in the lite tier (decorative foreground only, never over counted props).
 * No filter lives here: a filtered lane that animates re-runs the blur every frame.
 */
export function Layer({ z, par = 0, drift, lite = true, children, className }: { z: number; par?: number; drift?: 'a' | 'b'; lite?: boolean; children: ReactNode; className?: string }) {
  const style = { '--z': `${z}px`, '--s': ((PERSPECTIVE - z) / PERSPECTIVE).toFixed(4), '--par': par } as CSSProperties;
  return (
    <div aria-hidden className={`nx-layer ${className ?? ''}`} style={style} data-drift={drift} data-lite={lite ? undefined : '0'}>
      {children}
    </div>
  );
}
