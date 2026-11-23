'use client';
import { Item } from './kit';
import { Frame, Plate, css, defOf, nums } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

type Plates = { t: string[]; rank: number[]; pair: string[]; win: number };
const ROW = 80; // units the row spans; slot k sits at (k + 0.5) * ROW / n

/**
 * espace.tag-row: the objects a story names, once each, in a row on their pedestals with a plate each. The plates show the question's own numbers
 * (the cards of an order or match question, the choices of a "which is biggest" question, the numbers the text paints). Setting
 * `es:tags:<glyph>:<room>:<plate>`; `n` is the spelled count of the text.
 * Reveal: every pod glides to its place in the order (ease with overshoot), gets its rank badge; a match pod receives its partner card; the right one lifts.
 */
export default function TagRow({ scene }: ArchetypeProps) {
  const d = defOf(scene);
  const R = scene.revealed;
  const p = scene.visual?.kind === 'plates' ? (scene.visual.data as Plates) : null;
  const painted = nums(scene).filter((_, k) => scene.spec.bind[`n${k}`] !== undefined);
  const count = p ? p.t.length : (scene.values.n ?? painted.length);
  const label = (k: number) => p?.t[k] ?? painted[k];
  // painted numbers sort by value; cards and choices carry their own rank
  const rank = p ? p.rank : painted.map((x, i) => painted.filter((y, j) => y < x || (y === x && j < i)).length);
  const top = p && p.win >= 0 ? p.win : painted.length > 1 ? painted.indexOf(Math.max(...painted)) : -1;
  const long = Math.max(0, ...Array.from({ length: count }, (_, k) => String(label(k) ?? '').length)) > 6;
  const row = long ? 84 : ROW; // sentence cards get a wider row so they wrap in fewer lines
  const glide = !(p && p.pair.length); // a match keeps its cards where they are: partners hang below, nothing swaps places
  const w = Math.min(long ? 17 : 15, (row - 2) / Math.max(1, count));
  return (
    <Frame scene={scene} glyphs={[d.g]}>
      <div className={`es-row ${long ? 'es-long' : ''}`} style={css({ '--rn': count, '--rw': w, '--row': row })}>
        {Array.from({ length: count }, (_, k) => {
          const to = R && glide ? (rank[k] ?? k) : k;
          return (
            <div key={k} className={`es-pod mv-unit ${R ? 'es-sorted' : ''} ${R && k === top ? 'es-top' : ''}`} style={css({ '--i': k, '--k': k, '--to': to, '--dk': (k - to) * (ROW / count) })}>
              <div className="es-pod-it"><Item g={d.g} i={k * 2 + 1} /></div>
              <i className="es-ped" />
              <Plate v={label(k) ?? '?'} i={k} tone={label(k) === undefined ? 'q' : 'n'} className="mv-pulse" />
              {R && p?.pair[k] && <Plate v={`= ${p.pair[k]}`} i={k} tone="n" className="es-pairp" />}
              {R && glide && <b className="es-rank">{to + 1}</b>}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
