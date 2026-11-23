'use client';
import { Frame, Plate, css, defOf, nums } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

/**
 * espace.gauge: fuel, water and oxygen in litres, drawn as real tanks with a glass gauge. The level is a liquid box scaled from the bottom (compositor only).
 * Modes (`es:gauge:tank:<room>:<mode>`): add (a, then b poured in), sub (a, then b lost or used), steps (a, minus b, plus c), two (two tanks a and b, the
 * reveal pours both into one), bars (the tanks of a bar chart, values from the visual). Right: the liquid rises or falls to the new level with a small
 * overshoot and the new total shows. Gentle miss: the hose and the change glow while the level steps through each part.
 */
const niceMax = (v: number) => {
  const m = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / (m / 2)) * (m / 2);
};
function Tank({ lvl, from, label, i, max, tag, extra }: { lvl: number; from: number; label?: string; i: number; max: number; tag?: string | number; extra?: string }) {
  return (
    <div className="gg-tank mv-unit" style={css({ '--i': i, '--f0': Math.max(0.04, from / max), '--f1': Math.max(0.04, lvl / max) })}>
      <div className="gg-body">
        <i className="gg-liq" />
        <i className="gg-gloss" />
        <i className="gg-marks" />
      </div>
      <i className="gg-foot" />
      <Plate v={tag ?? `${Math.round(lvl)} L`} i={i} tone="n" className="gg-tag" />
      {label && <b className="gg-name">{label}</b>}
      {extra && <b className="gg-extra">{extra}</b>}
    </div>
  );
}

export default function Gauge({ scene }: ArchetypeProps) {
  const d = defOf(scene);
  const N = nums(scene);
  const R = scene.revealed;
  const [a = 0, b = 0, c = 0] = N;
  let body;
  if (d.x === 'bars') {
    const bars = ((scene.visual?.data as { bars?: { value: number; label?: { fr?: string; en?: string } }[] })?.bars ?? []);
    const vals = bars.map((x) => x.value);
    const mx = niceMax(Math.max(...vals, 1));
    body = (
      <div className="gg-tanks" style={css({ '--tn': vals.length })}>
        {vals.map((v, k) => (
          <Tank key={k} i={k} lvl={v} from={v} max={mx} label={String.fromCharCode(65 + k)} />
        ))}
        {R && <Plate v={scene.shown?.startsWith('≈') ? `${scene.shown} L` : `= ${vals.reduce((s, x) => s + x, 0)} L`} className="es-total" />}
      </div>
    );
  } else if (d.x === 'two' || d.x === 'cmp') {
    const mx = niceMax(Math.max(a, b));
    body = (
      <div className="gg-tanks" style={css({ '--tn': 2 })}>
        <Tank i={0} lvl={a} from={a} max={mx} label="1" />
        {d.x === 'two' && <b className="es-op gg-plus">+</b>}
        <Tank i={1} lvl={b} from={b} max={mx} label="2" />
        {R && <Plate v={scene.shown?.startsWith('≈') ? `${scene.shown} L` : d.x === 'two' ? `${a + b} L` : `${Math.abs(a - b)} L`} className="es-total" />}
      </div>
    );
  } else {
    const steps = d.x === 'steps';
    const end = d.x === 'add' ? a + b : steps ? a - b + c : a - b;
    const mx = niceMax(Math.max(a, end, steps ? a - b : 0, steps ? a + c : 0) * 1.0);
    body = (
      <div className="gg-tanks gg-one" style={css({ '--tn': 1 })}>
        <Tank i={0} lvl={R ? end : a} from={a} max={mx} extra={undefined} />
        <div className={`gg-hose ${d.x === 'add' ? 'gg-in' : 'gg-outflow'}`}>
          <i className="gg-pipe" />
          <i className="gg-drop" />
          <Plate v={`${d.x === 'add' ? '+' : '−'} ${b} L`} tone={d.x === 'add' ? 'q' : 'out'} i={1} className="mv-pulse" />
        </div>
        {steps && (
          <div className="gg-hose gg-in gg-second">
            <i className="gg-pipe" />
            <i className="gg-drop" />
            <Plate v={`+ ${c} L`} tone="q" i={2} className="mv-pulse" />
          </div>
        )}
      </div>
    );
  }
  return <Frame scene={scene} glyphs={[]}>{body}</Frame>;
}
