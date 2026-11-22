'use client';
import { useId, type CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Cloud, Drop, Dropper, MedDefs, Puppy } from '../kit/medecine';
import { Motes, Sprite } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import '../kit/medecine.css';
import './dose-vial.css';

// Art units (--u). The jar is a graduated dose vial: 5 drops per row, marks at 5, 10, 15, 20, filled from the bottom.
const COLS = 5;
const CELL = 4.6; // one drop cell
const PAD = 1.6; // glass padding
const MARK_W = 3.4; // marks column
const JAR_W = COLS * CELL + PAD * 2 + MARK_W;
const JAR_X = 13; // jar centre
const FEET = 15; // counter line the puppy and jar stand on
const LEFT_EDGE = JAR_X - JAR_W / 2;
const colX = (c: number) => LEFT_EDGE + PAD + (c + 0.5) * CELL; // art-unit x of a column centre

/**
 * The dropper visits the column of every missing drop and the puppy's pupils follow it: keyframes are generated from the numbers,
 * so any total and any given work. `t0` is the first release, `step` the seconds between releases.
 */
function pathCss(scope: string, uid: string, given: number, left: number, t0: number, step: number, phase: 'ok' | 'ko') {
  if (left <= 0) return '';
  const T = t0 + left * step + 0.7;
  const c0 = given % COLS;
  let dropper = '0%{transform:translateX(0)}';
  let eyes = '0%{transform:translate(1.9px,-1.6px)}';
  for (let k = 0; k < left; k++) {
    const dx = (((given + k) % COLS) - c0) * CELL;
    const a = (((t0 + k * step - 0.3) / T) * 100).toFixed(2);
    const b = (((t0 + k * step + 0.12) / T) * 100).toFixed(2);
    const tr = `transform:translateX(calc(var(--u)*${dx.toFixed(2)}))`;
    const ey = `transform:translate(${(1.9 + dx * 0.22).toFixed(2)}px,${(-1.6 + k * 0.05).toFixed(2)}px)`;
    dropper += `${a}%{${tr}}${b}%{${tr}}`;
    eyes += `${a}%{${ey}}${b}%{${ey}}`;
  }
  dropper += '100%{transform:translateX(0)}';
  eyes += '100%{transform:translate(1.9px,-1.6px)}';
  const n = `${uid}${phase}`;
  const sel = `.nx-stage[data-phase='${phase}'] ${scope}`;
  const dur = `${T.toFixed(2)}s var(--nx-ease-io) calc(var(--rv-base,0s) + 0.35s) both`;
  return `@keyframes dvp-${n}{${dropper}}@keyframes dvl-${n}{${eyes}}${sel} .dv-dropper-move{animation:dvp-${n} ${dur}}${sel} .pp-pupils{animation:dvl-${n} ${dur}}`;
}

function Backdrop() {
  return (
    <>
      <div className="dv-wall" />
      <div className="dv-lampglow" />
      <i className="dv-lamp" />
      <div className="dv-poster">
        <b />
        <b />
      </div>
      <div className="dv-shelf">
        {[0, 1, 2, 3, 4].map((k) => (
          <i key={k} style={{ '--k': k } as CSSProperties} />
        ))}
      </div>
      <div className="dv-window">
        <i className="dv-sun" />
        <i className="dv-hill" />
      </div>
      <div className="dv-curtain nx-anim" />
    </>
  );
}

/**
 * medecine.dose-vial: a dose vial with marks to the total, `given` drops inside, a puppy that watches the dropper (brief medecine.doses.001).
 * Right: the dropper visits each free column and the missing drops fall in, counted 1 to N, the puppy takes them with a smile.
 * Gentle miss: the typical wrong value (a derived ghost number) hangs pale and slides away, then the same correct fill, slower, with a puppy head tilt.
 */
export default function DoseVial({ scene }: ArchetypeProps) {
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const total = scene.values.total ?? 0;
  const given = scene.values.given ?? 0;
  const left = Math.max(0, total - given);
  if (total > 30 || total < 1) throw new Error('medecine.dose-vial holds 1 to 30 drops; use a bigger vial archetype above');
  const rows = Math.ceil(total / COLS);
  const jarH = rows * CELL + PAD * 2 + 1.4;
  const tipY = FEET - jarH - 1.2;
  const cellPos = (idx: number) => ({ r: Math.floor(idx / COLS), c: idx % COLS });
  const cellY = (idx: number) => FEET - PAD - 0.3 - (cellPos(idx).r + 0.5) * CELL;
  const ghost = scene.values.wrong;
  const marks = Array.from({ length: Math.floor(total / COLS) }, (_, r) => (r + 1) * COLS);
  const scope = `.dv-root[data-id='${uid}']`;
  const css = pathCss(scope, uid, given, left, 0.95, 0.42, 'ok') + pathCss(scope, uid, given, left, 1.15, 0.6, 'ko');
  const gridStyle = { '--rows': rows, '--cell': `calc(var(--u) * ${CELL})` } as CSSProperties;
  return (
    <div className="dv-root" data-id={uid} style={{ "--left": left } as CSSProperties}>
      <style>{css}</style>
      <Layer z={-170} par={-1} drift="a">
        <Backdrop />
        <Motes n={6} colour="rgb(255 255 240 / 0.9)" />
      </Layer>
      <Layer z={-55} par={-0.4} drift="b">
        <div className="dv-counter" />
      </Layer>
      <Layer z={0}>
        <MedDefs />
        <Sprite x={-28} y={FEET} w={24} anchor="feet">
          <i className="dv-table" />
          <div className="nx-shadow dv-pshadow" />
          <div className="mv-unit dv-puppy nx-anim">
            <Puppy />
          </div>
          <div className="dv-cloud-wrap">
            <div className="dv-cloud nx-anim">
              <Cloud />
            </div>
          </div>
        </Sprite>
        <Sprite x={JAR_X} y={FEET} w={JAR_W} anchor="feet">
          <div className="nx-shadow dv-jshadow" />
          <div className="dv-jar" style={gridStyle}>
            <div className="dv-glass">
              <div className="nx-gloss" />
            </div>
            {/* empty places: faint guides, then the missing drops fall into them */}
            {Array.from({ length: left }, (_, k) => {
              const { r, c } = cellPos(given + k);
              return <i key={`g${k}`} className="dv-guide" style={{ gridColumn: c + 1, gridRow: rows - r }} />;
            })}
            {Array.from({ length: given }, (_, k) => {
              const { r, c } = cellPos(k);
              return (
                <span key={`t${k}`} className="dv-slot dv-taken" style={{ gridColumn: c + 1, gridRow: rows - r, '--n': k } as CSSProperties}>
                  <Drop kind="blue" />
                </span>
              );
            })}
            {Array.from({ length: left }, (_, k) => {
              const { r, c } = cellPos(given + k);
              const fall = tipY - cellY(given + k); // negative: starts above, falls straight down
              return (
                <span key={`a${k}`} className="dv-slot dv-add" style={{ gridColumn: c + 1, gridRow: rows - r, '--n': k, '--fall': `calc(var(--u) * ${fall.toFixed(2)})` } as CSSProperties}>
                  <Drop kind="gold" n={k + 1} />
                </span>
              );
            })}
            {marks.map((m, r) => (
              <b key={m} className="dv-mark" style={{ gridRow: rows - r }}>
                {m}
              </b>
            ))}
          </div>
          <div className="dv-dropper-move nx-anim" style={{ '--dx': colX(given % COLS) - LEFT_EDGE - 3.1 } as CSSProperties}>
            <div className="dv-dropper nx-float">
              <Dropper />
            </div>
          </div>
          {ghost !== undefined && (
            <div className="dv-ghost-wrap">
              <div className="mv-ghost dv-ghost">{ghost}</div>
            </div>
          )}
          {left > 0 && (
            <div className="dv-badge" style={{ '--n': left } as CSSProperties}>
              {left}
            </div>
          )}
        </Sprite>
      </Layer>
    </div>
  );
}
