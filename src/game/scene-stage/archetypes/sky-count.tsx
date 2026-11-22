'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Glyph, GlyphDefs, glyphName } from '../kit/glyphs';
import { Backdrop } from '../kit/worlds';
import { Motes } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import './sky-count.css';

/**
 * espace.sky-count: a story with numbers and no picture data. Each prop group of the spec (its id is a glyph: rocket, star, planet, astronaut...)
 * floats in its own lit cluster inside the space window, as many as the bound number, with that number on a tag. Right: each cluster hops in turn.
 * Gentle miss: the tags are counted one by one and swell. The station and the room come from the shared espace backdrop.
 */
export default function SkyCount({ scene }: ArchetypeProps) {
  const groups = scene.spec.props.map((p) => scene.props[p.id]).filter((p): p is NonNullable<typeof p> => !!p);
  let k = 0;
  return (
    <div className="sk-root" style={{ '--n': Math.max(groups.length, 1) } as CSSProperties}>
      <Layer z={-150} par={-0.8} drift="a">
        <Backdrop world="espace" requires={scene.spec.requires ?? []} />
      </Layer>
      <Layer z={0}>
        <GlyphDefs names={groups.map((g) => glyphName(g.id.replace(/-d+$/, ''), 'star'))} />
        <div className="sk-row">
          {groups.map((g, gi) => (
            <div key={g.id} className="sk-group" style={{ '--gi': gi } as CSSProperties}>
              <div className="sk-cluster">
                {Array.from({ length: Math.min(g.count, 24) }, (_, j) => (
                  <div key={j} className="sk-it mv-unit" style={{ '--i': k++, '--j': j } as CSSProperties}>
                    <Glyph g={glyphName(g.id.replace(/-d+$/, ''), 'star')} i={gi * 3 + j} />
                  </div>
                ))}
              </div>
              <b className="sk-tag mv-count2">{g.count}</b>
            </div>
          ))}
        </div>
        <i className="sk-floor" />
        <Motes n={6} colour="rgb(200 240 255 / 0.9)" />
      </Layer>
    </div>
  );
}
