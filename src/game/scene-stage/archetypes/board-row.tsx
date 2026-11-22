'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { Flag, Pawn } from '../kit/echecs';
import { Motes, Sprite } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import '../kit/echecs.css';
import './board-row.css';

// Board art: viewBox 1000 x 200. A long lacquered row seen close from the side: top face between y 30 and y 150 (wider near), a front face below.
const VB = { w: 1000, h: 200 };
const TOP = { y: 30, x0: 90, x1: 910 };
const BOT = { y: 150, x0: 20, x1: 980 };
const FACE = 178;
const BOARD_W = 94; // art units
const FEET_T = 0.5; // pawns stand in the middle of the square depth
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pct = (n: number, tot: number) => `${((n / tot) * 100).toFixed(2)}%`;

function quad(i: number, cols: number) {
  const xt0 = lerp(TOP.x0, TOP.x1, i / cols);
  const xt1 = lerp(TOP.x0, TOP.x1, (i + 1) / cols);
  const xb0 = lerp(BOT.x0, BOT.x1, i / cols);
  const xb1 = lerp(BOT.x0, BOT.x1, (i + 1) / cols);
  return { d: `M${xt0} ${TOP.y}L${xt1} ${TOP.y}L${xb1} ${BOT.y}L${xb0} ${BOT.y}Z`, cx: (xt0 + xt1 + xb0 + xb1) / 4, pts: [xt0, xt1, xb0, xb1] as const };
}

/** The static board: two paths for the squares, a bevelled frame, a front face. Nothing in here animates, so it is rasterised once. */
function BoardArt({ cols }: { cols: number }) {
  const light: string[] = [];
  const dark: string[] = [];
  for (let i = 0; i < cols; i++) (i % 2 === 0 ? dark : light).push(quad(i, cols).d);
  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="br-art" aria-hidden>
      <defs>
        <linearGradient id="br-lt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbeccb" />
          <stop offset="1" stopColor="#ecd0a0" />
        </linearGradient>
        <linearGradient id="br-dk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fa0b5" />
          <stop offset="1" stopColor="#5f7f96" />
        </linearGradient>
        <linearGradient id="br-fr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a34" />
          <stop offset="1" stopColor="#4b2e1b" />
        </linearGradient>
      </defs>
      <path d={`M${TOP.x0 - 22} ${TOP.y - 12}L${TOP.x1 + 22} ${TOP.y - 12}L${BOT.x1 + 14} ${BOT.y + 4}L${BOT.x0 - 14} ${BOT.y + 4}Z`} fill="#5e3a21" />
      <path d={`M${BOT.x0 - 14} ${BOT.y + 4}L${BOT.x1 + 14} ${BOT.y + 4}L${BOT.x1 + 16} ${FACE}L${BOT.x0 - 16} ${FACE}Z`} fill="url(#br-fr)" />
      <path d={light.join('')} fill="url(#br-lt)" />
      <path d={dark.join('')} fill="url(#br-dk)" />
      <path d={`M${TOP.x0} ${TOP.y + 1}L${TOP.x1} ${TOP.y + 1}`} stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
    </svg>
  );
}

/** A cosy club room: panelled wall and a window to the snow (flakes fall slowly outside). Static except the flakes, which are tiny promoted boxes. */
function Backdrop() {
  return (
    <>
      <div className="br-wall" />
      <div className="br-window">
        <i className="br-roofs" />
        <i className="br-fir" style={{ left: '14%' }} />
        <i className="br-fir br-fir2" style={{ left: '66%' }} />
        {Array.from({ length: 9 }, (_, k) => (
          <i key={k} className="br-flake nx-anim" style={{ '--k': k } as CSSProperties} />
        ))}
      </div>
    </>
  );
}

/** echecs.board-row: one long board row, close side view, in a cosy club room with a window to the snow, lit by a soft overhead lamp (brief echecs.cases.004). */
export default function BoardRow({ scene }: ArchetypeProps) {
  const cols = scene.values.cols ?? 8;
  const covered = new Set((scene.props.pawns?.cells ?? []).map((c) => c.x - 1));
  const free = Array.from({ length: cols }, (_, i) => i).filter((i) => !covered.has(i));
  const placed = [...covered].sort((a, b) => a - b);
  const rows = scene.visual?.data?.rows;
  if (typeof rows === 'number' && rows !== 1) throw new Error('echecs.board-row draws one row; use a grid archetype for more');
  const feetTop = pct(TOP.y + (BOT.y - TOP.y) * FEET_T, VB.h);
  return (
    <div className="br-root">
      <Layer z={-170} par={-1.1} drift="a">
        <Backdrop />
      </Layer>
      <Layer z={-60} par={-0.5} drift="b">
        <div className="br-table" />
        <Sprite x={-38} y={21} w={11}>
          <svg viewBox="0 0 60 44" aria-hidden>
            <ellipse cx="30" cy="36" rx="28" ry="7" fill="#fff" />
            <ellipse cx="30" cy="34" rx="22" ry="5" fill="#e9eef5" />
            <path d="M14 14 H46 L43 32 Q30 38 17 32Z" fill="#fffdf8" />
            <ellipse cx="30" cy="14" rx="16" ry="4" fill="#7a4a2c" />
            <path d="M46 18 Q56 18 54 26 Q52 31 44 29" fill="none" stroke="#fffdf8" strokeWidth="3.4" />
          </svg>
        </Sprite>
        <Sprite x={34} y={21} w={13}>
          <svg viewBox="0 0 70 40" aria-hidden>
            <ellipse cx="35" cy="28" rx="33" ry="9" fill="#fff" />
            <path d="M12 26 Q20 6 36 8 Q52 6 60 26 Q36 32 12 26Z" fill="#e2a653" />
            <path d="M26 12 Q31 22 29 28 M38 10 Q42 21 41 29 M48 14 Q50 22 49 28" stroke="#c27f31" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </Sprite>
        <Sprite x={40} y={-3} w={13} anchor="feet">
          <svg viewBox="0 0 60 70" aria-hidden>
            <path d="M12 68 L15 44 H45 L48 68Z" fill="#c8754a" />
            <path d="M30 44 C14 34 12 14 22 4 C26 14 30 24 30 44 M30 44 C40 32 50 24 54 10 C42 12 32 26 30 44 M30 44 C26 30 16 22 6 20 C10 32 20 40 30 44" fill="#4f9a6a" />
          </svg>
        </Sprite>
      </Layer>
      <Layer z={0}>
        <Sprite x={0} y="calc(var(--by, 5) + 0.8)" w={BOARD_W} className="br-rock nx-anim">
          <div className="br-board">
            <BoardArt cols={cols} />
            <div className="nx-gloss br-gloss" />
            {/* the free places: dim glow that breathes (hook), then a flag and a count at the answer */}
            {free.map((i, k) => {
              const q = quad(i, cols);
              return <div key={`g${i}`} className="mv-gap br-gap" style={{ '--i': k, left: pct(q.cx, VB.w), top: pct(TOP.y + (BOT.y - TOP.y) * 0.5, VB.h), width: pct(((q.pts[1] - q.pts[0]) + (q.pts[3] - q.pts[2])) / 2, VB.w) } as CSSProperties} />;
            })}
            {free.map((i, k) => (
              <div key={`f${i}`} className="br-mark" style={{ left: pct(quad(i, cols).cx, VB.w), top: feetTop }}>
                <div className="mv-flag br-flag" style={{ '--i': k } as CSSProperties}>
                  <Flag colour={k % 2 ? '#ff9db6' : '#ffd36b'} />
                </div>
                <div className="mv-count br-count" style={{ '--i': k } as CSSProperties}>
                  {k + 1}
                </div>
              </div>
            ))}
            {placed.map((i, k) => (
              <div key={`p${i}`} className="br-pawn" style={{ left: pct(quad(i, cols).cx, VB.w), top: feetTop, '--i': k } as CSSProperties}>
                <div className="nx-shadow br-shadow" />
                <div className="mv-unit br-unit nx-anim" style={{ '--i': k, '--sb': -4.2 } as CSSProperties}>
                  <div className={`br-hop nx-anim ${i === placed[placed.length - 1] ? 'br-last' : ''}`}>
                    <div className="br-breath nx-anim" style={{ '--d': `${1.7 + k * 0.43}s` } as CSSProperties}>
                      <Pawn i={k} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Sprite>
        <Motes n={6} />
      </Layer>
      <Layer z={70} par={1.4} drift="a" lite={false}>
        <div className="br-lamp" />
      </Layer>
    </div>
  );
}
