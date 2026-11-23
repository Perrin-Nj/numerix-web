import type { CSSProperties, ReactNode } from 'react';
import { Layer } from '../../Layer';
import type { ResolvedScene } from '../../spec';
import { Motes } from '../../kit/Sprite';
import { Crew, EsDefs } from './kit';
import { RoomLayers, asRoom } from './Rooms';

/** The settings of the espace archetypes are `es:<mode>:<glyph>:<room>[:<extra>]`. One string carries the hand-made composition of a question. */
export type Def = { mode: string; g: string; room: ReturnType<typeof asRoom>; x: string };
export function defOf(s: ResolvedScene): Def {
  const [, mode = '', g = 'star', room = 'control', x = ''] = s.spec.setting.split(':');
  return { mode, g, room: asRoom(room), x };
}
/** Bound numbers n0..n7 in order, the ones that exist. */
export const nums = (s: ResolvedScene): number[] => Array.from({ length: 8 }, (_, k) => s.values[`n${k}`]).filter((v): v is number => v !== undefined);
export const u = (v: number) => `calc(${v} * var(--u))`;
export const css = (o: Record<string, string | number>) => o as unknown as CSSProperties;

/** The crew member who lives in every scene: looks at the picture, blinks, cheers at a right answer (crouch, jump, overshoot), tilts and points at a miss. */
export function Host({ i = 0, x = 90, y = 46, w = 12 }: { i?: number; x?: number; y?: number; w?: number }) {
  return (
    <div className="es-host" style={css({ '--hx': x, '--hy': y, '--hw': w })}>
      <i className="es-host-shadow nx-shadow" />
      <div className="es-host-in nx-anim">
        <div className="es-host-fig">
          <Crew i={i} />
        </div>
      </div>
    </div>
  );
}

/** Frame: the room lanes, the 100 x 50 unit subject box, the crew member. `glyphs` are the symbols the subject uses. */
export function Frame({ scene, glyphs, host = true, hostAt, children, className = '' }: { scene: ResolvedScene; glyphs: readonly string[]; host?: boolean; hostAt?: { x: number; y: number; w?: number }; children: ReactNode; className?: string }) {
  const d = defOf(scene);
  return (
    <div className={`es-root ${className}`} data-room={d.room} data-mode={d.mode}>
      <RoomLayers room={d.room} clock={scene.spec.requires?.includes('clock')} />
      <Layer z={0}>
        <EsDefs names={glyphs} />
        <div className="es-box">{children}</div>
        {host && (
          <div className="es-box es-host-box">
            <Host x={hostAt?.x ?? 90} y={hostAt?.y ?? 46} w={hostAt?.w ?? 12} i={[...(scene.spec.brief?.id ?? scene.spec.setting)].reduce((a, c) => a + c.charCodeAt(0), 0) % 4} />
          </div>
        )}
        <Motes n={4} colour="rgb(255 240 200 / 0.85)" />
      </Layer>
    </div>
  );
}

/** A number plate: big readable digits on a lit tag. */
export function Plate({ v, i = 0, tone = 'n', className = '' }: { v: ReactNode; i?: number; tone?: 'n' | 'q' | 'out'; className?: string }) {
  return (
    <b className={`es-plate es-${tone} ${className}`} style={css({ '--i': i })}>
      {v}
    </b>
  );
}
