'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Glyph, GlyphDefs } from '../kit/glyphs';
import { Motes } from '../kit/Sprite';
import { Backdrop } from '../kit/worlds';
import type { ArchetypeProps } from '../registry';
import './group.css';

/**
 * "n groups of m": n containers (a table, a tray, a crate, a box, a row) each holding exactly m of the question's own object.
 * Bound from the text ("4 paquets de 10 ..."): `n` and `m`, the object is the second prop id (a glyph id), the container is in the setting.
 * Right: the containers cheer in turn and a total chip n x m appears (a derived number, never typed). Gentle miss: the containers are counted
 * one by one (m, 2m, 3m ...), each tag swelling once. Nothing is drawn that the story does not name.
 */
export default function Group({ scene }: ArchetypeProps) {
  const world = scene.spec.archetype.split('.')[0]!;
  const n = scene.values.n;
  const m = scene.values.m;
  if (!n || !m) throw new Error('group needs n and m');
  const noun = scene.spec.props[1]?.id.replace(/-\d+$/, '') ?? 'star';
  const kind = scene.spec.setting.split('-').pop() ?? 'box';
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  const cols = Math.min(m, Math.max(2, Math.ceil(Math.sqrt(m * 1.4))));
  return (
    <div className="gp-root" data-world={world} data-c={kind} style={{ '--n': n, '--per': perRow, '--cols': cols, '--rows': Math.ceil(m / cols), '--lines': Math.ceil(n / perRow) } as CSSProperties}>
      <Layer z={-150} par={-0.8} drift="a">
        <Backdrop world={world} requires={scene.spec.requires ?? []} room={scene.spec.room} seed={scene.spec.brief?.id} />
      </Layer>
      <Layer z={0}>
        <GlyphDefs names={[noun]} />
        <div className="gp-grid">
          {Array.from({ length: n }, (_, k) => (
            <div key={k} className="gp-box mv-unit" style={{ '--i': k } as CSSProperties}>
              <div className="gp-in">
                {Array.from({ length: m }, (_, j) => (
                  <div key={j} className="gp-it" style={{ '--j': j } as CSSProperties}>
                    <Glyph g={noun} i={k + j} />
                  </div>
                ))}
              </div>
              <b className="gp-tag" style={{ '--i': k } as CSSProperties}>{m * (k + 1)}</b>
            </div>
          ))}
        </div>
        {scene.revealed && <b className="gp-total">{n * m}</b>}
        <Motes n={4} colour="rgb(255 245 210 / 0.9)" />
      </Layer>
    </div>
  );
}
