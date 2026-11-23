'use client';
import { Item } from './kit';
import { Frame, Plate, css, defOf } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

type Cell = { x: number; y: number; label?: { fr?: string; en?: string } };
/** The place a map cell names, drawn as itself (French label of the seed). */
const PLACE: Record<string, string> = { serre: 'dome', labo: 'flask', dock: 'dock', cuisine: 'meal', gym: 'gym', tour: 'tower', robot: 'robot', outils: 'tool', rampe: 'ramp', serveur: 'module', panneau: 'panel', cratère: 'beacon' };
const glyphOfCell = (c: Cell) => PLACE[(c.label?.fr ?? '').toLowerCase()] ?? 'beacon';
const WORDS = { fr: ['colonnes', 'rangées', 'colonne', 'rangée'], en: ['columns', 'rows', 'column', 'row'] };

/**
 * espace.star-grid: the base map of a carte question on the control-room table. Columns and rows are numbered on the edges (with their names), every cell
 * the visual names shows its place (greenhouse dome, lab, dock arm, kitchen, tower, ramp...) and its name. Setting `es:grid:map:<room>:<mode>.<cells>`.
 * Reveal by mode: path (a crew member walks from one place to another along a drawn line, the direction arrow pops), rover (the rover drives the story's
 * legs square by square, each square counted), count (the asked cells light and are counted), ring (the asked cell is ringed and named by column and row),
 * panels (a front view of a solar module, the rows are counted). The answer plate appears last.
 */
export default function StarGrid({ scene, locale }: ArchetypeProps) {
  const d = defOf(scene);
  const [mode = 'count', ...rest] = d.x.split('.');
  const sel = rest.map(Number);
  const data = (scene.visual?.data ?? {}) as { cells?: Cell[] };
  const cols = scene.values.cols ?? 1;
  const rows = scene.values.rows ?? 1;
  const cells = (data.cells ?? []).slice(0, 40);
  const R = scene.revealed;
  const ans = scene.values.ans;
  const w = WORDS[locale === 'en' ? 'en' : 'fr'];
  const cs = Math.min(62 / cols, 30 / rows, 13);
  const at = (c: Cell) => css({ '--gx': c.x - 1, '--gy': c.y - 1 });
  const a = cells[sel[0] ?? 0];
  const b = cells[sel[1] ?? 0];
  const panels = mode === 'panels';
  let reveal = null;
  if (R && (mode === 'path' || mode === 'rover') && a) {
    // legs: rover = n0 squares right then n1 down (the story's numbers); path = straight from a to b
    const right = mode === 'rover' ? (scene.values.n0 ?? 0) : (b?.x ?? a.x) - a.x;
    const down = mode === 'rover' ? (scene.values.n1 ?? 0) : (b?.y ?? a.y) - a.y;
    const end = { x: a.x + right, y: a.y + down };
    const arrow = Math.abs(right) >= Math.abs(down) ? (right >= 0 ? '→' : '←') : down >= 0 ? '↓' : '↑';
    const steps = mode === 'rover' ? [...Array.from({ length: Math.abs(right) }, (_, k) => ({ x: a.x + Math.sign(right) * (k + 1), y: a.y })), ...Array.from({ length: Math.abs(down) }, (_, k) => ({ x: end.x, y: a.y + Math.sign(down) * (k + 1) }))] : [];
    reveal = (
      <>
        {right !== 0 && <i className="sg-leg" style={css({ '--gx': Math.min(a.x, a.x + right) - 0.5, '--gy': a.y - 0.5, '--lw': Math.abs(right), '--lh': 0, '--o': right > 0 ? 0 : 1 })} />}
        {down !== 0 && <i className="sg-leg sg-leg2" style={css({ '--gx': end.x - 0.5, '--gy': Math.min(a.y, a.y + down) - 0.5, '--lw': 0, '--lh': Math.abs(down), '--o': down > 0 ? 0 : 1 })} />}
        {steps.map((s, k) => <b key={k} className="sg-step" style={css({ '--gx': s.x - 1, '--gy': s.y - 1, '--i': k })}>{k + 1}</b>)}
        <div className="sg-walker" style={css({ '--gx': end.x - 1, '--gy': end.y - 1, '--dx': a.x - end.x, '--dy': a.y - end.y, '--cy': mode === 'rover' ? a.y - end.y : (a.y - end.y) / 2, '--cx': mode === 'rover' ? 0 : (a.x - end.x) / 2 })}>
          <Item g={mode === 'rover' ? 'rover' : 'crew'} i={2} />
        </div>
        {mode === 'path' && <b className="sg-arrow" style={css({ '--gx': (a.x + end.x) / 2 - 1, '--gy': (a.y + end.y) / 2 - 1 })}>{arrow}</b>}
      </>
    );
  } else if (R && mode === 'count') {
    reveal = sel.map((k, j) => cells[k] && <b key={k} className="sg-ring sg-cnt" style={{ ...at(cells[k]!), '--i': j } as never}><span>{j + 1}</span></b>);
  } else if (R && mode === 'ring' && a) {
    reveal = <b className="sg-ring" style={at(a)} />;
  }
  const plate = R ? (mode === 'ring' && a ? `${w[2]} ${a.x}, ${w[3]} ${a.y}` : ans !== undefined ? `= ${ans}` : null) : null;
  return (
    <Frame scene={scene} glyphs={['crew', 'rover', ...new Set(cells.map(glyphOfCell))]} hostAt={{ x: 92, y: 46, w: 10 }}>
      <div className={`sg-map ${panels ? 'sg-panels' : ''}`} style={css({ '--cols': cols, '--rows': rows, '--cs': cs.toFixed(2) })}>
        <b className="sg-cap sg-capx">{w[0]} →</b>
        <b className="sg-cap sg-capy">{w[1]} ↓</b>
        {Array.from({ length: cols }, (_, k) => <b key={`c${k}`} className="sg-ax sg-axx" style={css({ '--gx': k })}>{k + 1}</b>)}
        {Array.from({ length: rows }, (_, k) => <b key={`r${k}`} className="sg-ax sg-axy" style={css({ '--gy': k })}>{k + 1}</b>)}
        <i className="sg-grid" />
        {cells.map((c, k) => (
          // a "which square is it" question keeps its target a "?" until the reveal: the picture must not read the answer out
          mode === 'ring' && !R && k === (sel[0] ?? 0) ? (
            <div key={k} className="sg-cell mv-unit" style={{ ...at(c), '--i': k } as never}>
              <Plate v="?" tone="q" className="mv-pulse" />
            </div>
          ) : (
            <div key={k} className="sg-cell mv-unit" style={{ ...at(c), '--i': k } as never}>
              {panels ? <i className="es-pcell" /> : <Item g={glyphOfCell(c)} i={k} />}
              {!panels && <span className="sg-name">{c.label?.[locale === 'en' ? 'en' : 'fr']}</span>}
            </div>
          )
        ))}
        {mode === 'rover' && a && !R && <div className="sg-walker sg-idle" style={at(a)}><Item g="rover" i={2} /></div>}
        {panels && R && Array.from({ length: rows }, (_, k) => <b key={`t${k}`} className="sg-rowt" style={css({ '--gy': k, '--i': k })}>{(k + 1) * cols}</b>)}
        {reveal}
      </div>
      {plate && <Plate v={plate} tone="n" className="es-total" />}
    </Frame>
  );
}
