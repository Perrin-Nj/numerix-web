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
const STARS = ['giraffe', 'hamster', 'guinea', 'ferret', 'dog', 'cat', 'rabbit', 'mouse'];
const DROPS_MAX = 80; // drops are one dot each: a vial of 48 shows 48 dots in tens, so it can be counted
const CAP = 40; // up to 40 things are drawn one by one (29 chairs are 29 chairs); a larger bar is a magnitude column with its number

/**
 * Chart archetype (echecs.piece-bars, medecine.shelf-chart, espace.star-chart): the question's own `bars` or `pictograph` as standing columns of
 * characters in the world's room. A bar of up to 12 is a stack of that many glyphs (countable); a bigger bar is a tall lit column with its number.
 * Right: the glyphs hop, one column at a time. Gentle miss: the numbers are read out column by column and pulse, nobody is blamed.
 */
export default function Chart({ scene, locale }: ArchetypeProps) {
  const world = scene.spec.archetype.split('.')[0]!;
  const skin = skinOf(world);
  const fallback = glyphName(scene.spec.setting.split('-').pop(), skin.glyph);
  const d = (scene.visual?.data ?? {}) as { bars?: Bar[]; rows?: Row[]; max?: number; each?: number; title?: L };
  const isBars = scene.visual?.kind === 'bars';
  const bars = isBars ? (d.bars ?? []) : [];
  const rows = isBars ? [] : (d.rows ?? []);
  const max = Math.max(d.max ?? 0, ...bars.map((b) => b.value), 1);
  const star = (scene.spec.requires ?? []).find((r) => STARS.includes(r)); // the animal the story names stands in the room
  const mascot = star ?? skin.mascot;
  let k = 0;
  const title = d.title?.[locale];
  return (
    <div className="ch-root" data-world={world} data-kind={isBars ? 'bars' : 'rows'} style={{ '--n': Math.max(bars.length, rows.length, 1) } as CSSProperties}>
      <Layer z={-150} par={-0.8} drift="a">
        <Backdrop world={world} requires={scene.spec.requires ?? []} room={scene.spec.room} seed={scene.spec.brief?.id} />
      </Layer>
      <Layer z={0}>
        <GlyphDefs names={[...bars.map((b) => glyphName(b.icon, fallback)), ...rows.map((r) => glyphName(r.icon, fallback)), mascot]} />
        {title && <b className="ch-title">{title}</b>}
        {isBars && (
          <div className="ch-cols">
            {bars.map((b, bi) => {
              const g = glyphName(b.icon, fallback);
              const small = b.value <= CAP;
              const dots = g === 'drop' && b.value > 12 && b.value <= DROPS_MAX;
              return (
                <div key={bi} className="ch-col" style={{ '--h': Math.max(b.value / max, 0.08), '--bi': bi } as CSSProperties}>
                  <b className="ch-val">{b.value}</b>
                  {dots ? (
                    <div className="ch-vial" style={{ '--rows': Math.ceil(b.value / 10) } as CSSProperties}>
                      {Array.from({ length: b.value }, (_, j) => (
                        <i key={j} className="ch-dp mv-unit" data-ten={(j + 1) % 10 === 0 ? 1 : undefined} style={{ '--i': k++ } as CSSProperties} />
                      ))}
                    </div>
                  ) : small ? (
                    <div className="ch-stack" style={{ '--cols': b.value <= 12 ? Math.min(b.value, 3) : b.value <= 24 ? 5 : 7 } as CSSProperties}>
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
              const g = glyphName(r.icon, fallback);
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
        <div className="ch-mascot" data-star={star ? 1 : undefined}>{world === 'echecs' ? <Pawn i={4} /> : <Glyph g={mascot} i={2} />}</div>
        <Motes n={4} colour={skin.mote} />
      </Layer>
    </div>
  );
}
