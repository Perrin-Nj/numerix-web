'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Glyph, GlyphDefs, glyphName } from '../kit/glyphs';
import { Pawn } from '../kit/echecs';
import { Backdrop, skinOf } from '../kit/worlds';
import { Motes } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import '../kit/echecs.css';
import './board.css';

type Cell = { x: number; y: number; label?: { fr?: string; en?: string } };
type Mark = { x: number; y: number; tone?: string };

/**
 * Grid archetype (echecs.grid-board, medecine.mat-grid, espace.star-grid): the question's own `grid` visual as a deep, lit tabletop.
 * Cols and rows come from the visual, every item stands on its own cell with a glyph chosen from the cell label (pawn, rook, dog, bandage, star...).
 * The reveal marks (`after.marks`) exist only once revealed: they light up one by one (right) or are counted 1, 2, 3 (gentle miss).
 */
export default function Board({ scene, locale }: ArchetypeProps) {
  const world = scene.spec.archetype.split('.')[0]!;
  const skin = skinOf(world);
  const named = scene.spec.setting.split('-').pop() ?? '';
  const fallback = glyphName(named, skin.glyph);
  const data = (scene.visual?.data ?? {}) as { cols?: number; rows?: number; cells?: Cell[]; after?: { marks?: Mark[] } };
  const cols = scene.values.cols ?? data.cols ?? 1;
  const rows = scene.values.rows ?? data.rows ?? 1;
  const cells = (data.cells ?? []).slice(0, 60);
  const marks = scene.revealed ? (data.after?.marks ?? []).slice(0, 60) : [];
  const cs = { '--cols': cols, '--rows': rows, '--c1': skin.c1, '--c2': skin.c2, '--fr': skin.frame } as CSSProperties;
  return (
    <div className="bd-root" style={cs} data-world={world}>
      <Layer z={-150} par={-0.8} drift="a">
        <Backdrop world={world} requires={scene.spec.requires ?? []} room={scene.spec.room} seed={scene.spec.brief?.id} />
      </Layer>
      <Layer z={0}>
        <GlyphDefs names={[...cells.map((c) => glyphName(c.label?.[locale], fallback)), skin.mascot]} />
        <div className="bd-plane">
          <div className="bd-board nx-gloss" />
          <div className="bd-shadow nx-shadow" />
          {marks.map((m, k) => (
            <i key={`m${k}`} className={`bd-mark mv-ring2 ${m.tone === 'good' ? 'bd-good' : ''}`} style={{ '--cx': m.x - 1, '--cy': m.y - 1, '--i': k } as CSSProperties} />
          ))}
          <div className="bd-items">
            {cells.map((c, k) => (
              <div key={k} className="bd-it mv-unit" style={{ '--cx': c.x - 1, '--cy': c.y - 1, '--i': k } as CSSProperties}>
                <Glyph g={glyphName(c.label?.[locale], fallback)} i={k} />
              </div>
            ))}
          </div>
        </div>
        <div className="bd-mascot" data-world={world}>
          {world === 'echecs' ? <Pawn i={2} /> : <Glyph g={skin.mascot} i={3} />}
        </div>
        <Motes n={4} colour={skin.mote} />
      </Layer>
    </div>
  );
}
