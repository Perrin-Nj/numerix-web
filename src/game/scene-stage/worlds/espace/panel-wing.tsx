'use client';
import { Item } from './kit';
import { Frame, Plate, css, defOf, nums } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

/**
 * espace.panel-wing: the solar panels of the station, in rows. n rows of m panels (up to 11 x 9), one wing or several, drawn as a real array on its mast over
 * the station exterior. Setting `es:wing:panel:exterior:<mode>`: one (n rows of m), wings (w wings of n rows of m), broken (n rows of m, b of them cracked).
 * Row labels and column labels are the question's own numbers; the total shows at the reveal. Right: a light runs along the rows, row by row, and the
 * array shines. Gentle miss: the rows are counted one by one (m, 2m, 3m ...) on the row tags, the way the explanation counts.
 */
export default function PanelWing({ scene, phase }: ArchetypeProps) {
  const d = defOf(scene);
  const N = nums(scene);
  const R = scene.revealed;
  const mixed = d.x === 'mixed';
  const wings = d.x === 'wings' ? N[0]! : mixed ? 2 : 1;
  const dims = mixed ? [{ rows: N[0]!, cols: N[1]! }, { rows: N[2]!, cols: N[3]! }] : Array.from({ length: wings }, () => ({ rows: d.x === 'wings' ? N[1]! : N[0]!, cols: d.x === 'wings' ? N[2]! : N[1]! }));
  const rows = dims[0]!.rows;
  const cols = dims[0]!.cols;
  const broken = d.x === 'broken' ? N[2]! : 0;
  const total = dims.reduce((s, x) => s + x.rows * x.cols, 0) - broken;
  const sat = d.x.endsWith('-sat');
  return (
    <Frame scene={scene} glyphs={sat ? ['probe'] : []} hostAt={{ x: 92, y: 47, w: 10 }}>
      <div className={`pw-wings ${wings > 1 ? 'pw-multi' : ''}`} style={css({ '--wn': wings, '--rows': rows, '--cols': cols })}>
        {Array.from({ length: wings }, (_, w) => (
          <div key={w} className="pw-wing" style={css({ '--w': w, '--rows': dims[w]!.rows })}>
            <Plate v={`${dims[w]!.cols}`} tone="n" i={1} className="pw-coltag" />
            <i className="pw-mast" />
            <div className="pw-array">
              {Array.from({ length: dims[w]!.rows }, (_, r) => (
                <div key={r} className="pw-row mv-unit" style={css({ '--i': r, '--cols': dims[w]!.cols })}>
                  {Array.from({ length: dims[w]!.cols }, (_, c) => (
                    <i key={c} className={`pw-cell ${broken && w === wings - 1 && rows * cols - (r * cols + c) <= broken ? 'pw-broken' : ''}`} />
                  ))}
                  {phase === 'ko' && (d.x !== 'wings' || w === wings - 1) && <b className="pw-rt" style={css({ '--i': r })}>{(r + 1) * dims[w]!.cols}</b>}
                </div>
              ))}
            </div>
            {<Plate v={`${dims[w]!.rows}`} tone="q" i={0} className="pw-rowtag" />}
            {sat && <div className="pw-sat"><Item g="probe" i={2} /></div>}
          </div>
        ))}
        {R && <Plate v={scene.shown?.startsWith('≈') ? scene.shown : `= ${total}`} className="es-total" />}
      </div>
    </Frame>
  );
}
