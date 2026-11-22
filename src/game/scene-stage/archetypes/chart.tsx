'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Glyph, GlyphDefs, glyphName } from '../kit/glyphs';
import { Pawn } from '../kit/echecs';
import { Backdrop, skinOf } from '../kit/worlds';
import { Motes } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import '../kit/echecs.css';
import './chart.css';

type L = { fr?: string; en?: string };
type Bar = { label?: L; value: number; icon?: string };
type Row = { label?: L; count: number; icon?: string };
const CAP = 12;

/**
 * Chart archetype (echecs.piece-bars, medecine.shelf-chart, espace.star-chart): the question's own `bars` or `pictograph` as standing columns of
 * characters in the world's room. A bar of up to 12 is a stack of that many glyphs (countable); a bigger bar is a tall lit column with its number.
 * Right: the glyphs hop, one column at a time. Gentle miss: the numbers are read out column by column and pulse, nobody is blamed.
 */
export default function Chart({ scene, locale }: ArchetypeProps) {
  const world = scene.spec.archetype.split('.')[0]!;
  const skin = skinOf(world);
  const d = (scene.visual?.data ?? {}) as { bars?: Bar[]; rows?: Row[]; max?: number; each?: number; title?: L };
  const isBars = scene.visual?.kind === 'bars';
  const bars = isBars ? (d.bars ?? []) : [];
  const rows = isBars ? [] : (d.rows ?? []);
  const max = Math.max(d.max ?? 0, ...bars.map((b) => b.value), 1);
  let k = 0;
  const title = d.title?.[locale];
  return (
    <div className="ch-root" data-world={world} data-kind={isBars ? 'bars' : 'rows'} style={{ '--n': Math.max(bars.length, rows.length, 1) } as CSSProperties}>
      <Layer z={-150} par={-0.8} drift="a">
        <Backdrop world={world} requires={scene.spec.requires ?? []} />
      </Layer>
      <Layer z={0}>
        <GlyphDefs names={[...bars.map((b) => glyphName(b.icon, skin.glyph)), ...rows.map((r) => glyphName(r.icon, skin.glyph)), skin.mascot]} />
        {title && <b className="ch-title">{title}</b>}
        {isBars && (
          <div className="ch-cols">
            {bars.map((b, bi) => {
              const g = glyphName(b.icon, skin.glyph);
              const small = b.value <= CAP;
              return (
                <div key={bi} className="ch-col" style={{ '--h': Math.max(b.value / max, 0.08), '--bi': bi } as CSSProperties}>
                  <b className="ch-val">{b.value}</b>
                  {small ? (
                    <div className="ch-stack" style={{ '--cols': Math.min(b.value, 3) } as CSSProperties}>
                      {Array.from({ length: b.value }, (_, j) => (
                        <div key={j} className="ch-tok mv-unit" style={{ '--i': k++ } as CSSProperties}>
                          <Glyph g={g} i={bi + j} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ch-tower mv-unit" style={{ '--i': bi } as CSSProperties}>
                      <Glyph g={g} i={bi} />
                    </div>
                  )}
                  <span className="ch-lab">{b.label?.[locale]}</span>
                </div>
              );
            })}
          </div>
        )}
        {!isBars && (
          <div className="ch-rows">
            {rows.map((r, ri) => {
              const g = glyphName(r.icon, skin.glyph);
              return (
                <div key={ri} className="ch-row">
                  <span className="ch-lab">{r.label?.[locale]}</span>
                  <div className="ch-line">
                    {Array.from({ length: Math.min(r.count, 30) }, (_, j) => (
                      <div key={j} className="ch-tok mv-unit" style={{ '--i': k++ } as CSSProperties}>
                        <Glyph g={g} i={ri + j} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <i className="ch-floor" />
        <div className="ch-mascot">{world === 'echecs' ? <Pawn i={4} /> : <Glyph g={skin.mascot} i={2} />}</div>
        <Motes n={4} colour={skin.mote} />
      </Layer>
    </div>
  );
}
