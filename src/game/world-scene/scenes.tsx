import type { CSSProperties, ReactNode } from 'react';
import type { WorldId } from '@/data/api/types';

/** Palette derived from the world token on the svg root (see WorldScene). */
export const C = {
  ll: 'var(--w-ll)',
  l: 'var(--w-l)',
  m: 'var(--w)',
  d: 'var(--w-d)',
  dd: 'var(--w-dd)',
  paper: 'var(--paper)',
  ink: 'var(--ink)',
  sun: 'var(--sun)',
};

export type Art = {
  /** Sky gradient, top then bottom. */
  sky: [string, string];
  /** Sky details: stars, clouds, planets. */
  backdrop: ReactNode;
  far: ReactNode;
  mid: ReactNode;
  near: ReactNode;
  /** Animated props in front of the ground, behind the hero. */
  front: ReactNode;
};

const v = (o: Record<string, string | number>) => o as CSSProperties;
const idx = (i: number) => v({ '--i': i });
const FB: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };
const FLOAT_DELAY = (i: number) => ({ animationDelay: `${i * -0.9}s` });

const STARS: [number, number][] = [
  [24, 20], [58, 44], [90, 16], [122, 52], [150, 24], [184, 40], [214, 14], [262, 34], [296, 18], [40, 78], [286, 70], [200, 70],
];

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-14} width={6} height={16} rx={2} fill={C.ink} />
      <g>
        <circle cx={0} cy={-26} r={15} fill={C.dd} />
        <circle cx={-9} cy={-18} r={10} fill={C.dd} />
        <circle cx={9} cy={-18} r={10} fill={C.dd} />
        <circle cx={-4} cy={-31} r={6} fill={C.d} opacity={0.8} />
      </g>
    </g>
  );
}

function nature(detail: boolean): Art {
  return {
    sky: [C.ll, C.l],
    backdrop: (
      <g className="nx-drift" style={v({ '--dx': '34px', '--drift-s': '38s' })} fill={C.paper} opacity={0.9}>
        <ellipse cx={70} cy={34} rx={26} ry={9} />
        <ellipse cx={90} cy={28} rx={17} ry={9} />
        <ellipse cx={235} cy={52} rx={22} ry={7} />
        <ellipse cx={250} cy={47} rx={14} ry={7} />
      </g>
    ),
    far: <path d="M-30 125 Q40 78 110 112 T250 100 T350 120 V190 H-30Z" fill={C.l} />,
    mid: (
      <>
        <path d="M-30 138 Q60 100 140 130 T350 128 V190 H-30Z" fill={C.m} />
        <Tree x={52} y={136} s={1} />
        <Tree x={270} y={134} s={1.05} />
        <Tree x={108} y={134} s={0.7} />
        <Tree x={216} y={133} s={0.75} />
      </>
    ),
    near: (
      <>
        <path d="M-20 142 Q80 134 160 144 T340 140 V190 H-20Z" fill={C.d} />
        {[70, 120, 205, 250].map((x, i) => (
          <g key={x} transform={`translate(${x} ${156 + (i % 2) * 8})`}>
            <circle r={2.6} fill={i % 2 ? C.sun : C.paper} />
            <rect x={-0.6} y={2} width={1.2} height={6} fill={C.dd} />
          </g>
        ))}
      </>
    ),
    front: detail ? (
      <>
        {[
          [96, 110], [130, 96], [214, 104], [236, 122], [78, 128], [186, 92],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.4} fill={C.sun} className="nx-twinkle" style={idx(i)} />
        ))}
      </>
    ) : (
      <>
        {[[110, 108], [208, 102], [228, 124]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={C.sun} className="nx-twinkle" style={idx(i)} />
        ))}
      </>
    ),
  };
}

function espace(detail: boolean): Art {
  const stars = detail ? STARS : STARS.slice(0, 8);
  return {
    sky: [C.dd, C.d],
    backdrop: (
      <>
        {stars.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.2} fill={C.paper} className="nx-twinkle" style={idx(i)} />
        ))}
        <circle cx={226} cy={62} r={26} fill={C.l} />
        <path d="M205 56 Q226 48 247 58" stroke={C.m} strokeWidth={4} fill="none" opacity={0.7} />
        <ellipse cx={226} cy={62} rx={44} ry={9} fill="none" stroke={C.sun} strokeWidth={3} transform="rotate(-18 226 62)" />
        <circle cx={62} cy={40} r={7} fill={C.paper} opacity={0.85} />
      </>
    ),
    far: <path d="M-30 128 L30 108 L70 124 L120 104 L180 126 L240 106 L350 124 V190 H-30Z" fill={C.m} opacity={0.55} />,
    mid: <path d="M-30 140 Q60 120 150 138 T350 132 V190 H-30Z" fill={C.l} opacity={0.6} />,
    near: (
      <>
        <path d="M-20 142 Q80 134 160 144 T340 140 V190 H-20Z" fill={C.d} />
        <ellipse cx={86} cy={160} rx={14} ry={4} fill={C.dd} />
        <ellipse cx={240} cy={164} rx={18} ry={5} fill={C.dd} />
        <ellipse cx={170} cy={174} rx={10} ry={3} fill={C.dd} />
      </>
    ),
    front: (
      <g transform="translate(104 92) rotate(-30)">
        <g className="nx-float">
          <path d="M-8 8 L-17 21 L-8 16Z M8 8 L17 21 L8 16Z" fill={C.sun} />
          <path d="M0 -24 Q11 -6 8 16 H-8 Q-11 -6 0 -24Z" fill={C.paper} />
          <circle cy={-5} r={4.2} fill={C.m} />
          <path d="M-4 17 Q0 36 4 17Z" fill={C.sun} className="nx-twinkle" />
        </g>
      </g>
    ),
  };
}

function cuisine(detail: boolean): Art {
  return {
    sky: [C.ll, C.l],
    backdrop: (
      <path
        d="M0 30H320M0 60H320M0 90H320M0 120H320M40 0V130M100 0V130M160 0V130M220 0V130M280 0V130"
        stroke={C.paper}
        strokeWidth={1.4}
        opacity={0.4}
      />
    ),
    far: detail ? (
      <>
        <rect x={-10} y={46} width={120} height={5} rx={2} fill={C.dd} />
        {[8, 30, 54, 80].map((x, i) => (
          <rect key={x} x={x} y={30} width={16} height={16} rx={4} fill={i % 2 ? C.sun : C.paper} />
        ))}
      </>
    ) : null,
    mid: (
      <>
        <path d="M262 -4V40" stroke={C.dd} strokeWidth={2} />
        <circle cx={262} cy={48} r={9} fill="none" stroke={C.dd} strokeWidth={3} />
        <path d="M284 -4V30" stroke={C.dd} strokeWidth={2} />
        <rect x={278} y={30} width={12} height={20} rx={5} fill={C.dd} />
      </>
    ),
    near: (
      <>
        <rect x={-20} y={134} width={360} height={60} fill={C.d} />
        <rect x={-20} y={129} width={360} height={8} fill={C.dd} />
      </>
    ),
    front: (
      <>
        <path d="M200 98 H244 V124 Q244 130 238 130 H206 Q200 130 200 124Z" fill={C.dd} />
        <path d="M196 99 H248 Q248 88 222 87 Q196 88 196 99Z" fill={C.m} />
        <rect x={192} y={106} width={8} height={5} rx={2} fill={C.ink} />
        <rect x={244} y={106} width={8} height={5} rx={2} fill={C.ink} />
        {[212, 222, 232].map((x, i) => (
          <path
            key={x}
            d={`M${x} 84 q-5 -8 0 -14 t0 -14`}
            stroke={C.paper}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            className="nx-rise-up"
            style={idx(i)}
          />
        ))}
        {[
          ['🍅', 108, 82], ['🥕', 196, 62], ['🧅', 70, 64],
        ].map(([e, x, y], i) => (
          <text key={e as string} x={x as number} y={y as number} fontSize={22} className="nx-float" style={FLOAT_DELAY(i)}>
            {e}
          </text>
        ))}
      </>
    ),
  };
}

function sport(detail: boolean): Art {
  return {
    sky: [C.ll, C.l],
    backdrop: (
      <>
        <path d="M-10 38 Q80 62 160 38 T330 38" stroke={C.ink} strokeWidth={1.4} fill="none" />
        {[22, 62, 100, 142, 180, 222, 262, 302].map((x, i) => (
          <path key={x} d={`M${x} ${i % 2 ? 48 : 44} l8 0 l-4 14Z`} fill={i % 3 === 0 ? C.sun : i % 3 === 1 ? C.paper : C.d} />
        ))}
      </>
    ),
    far: (
      <>
        <rect x={-20} y={72} width={360} height={36} fill={C.d} />
        {detail &&
          Array.from({ length: 32 }, (_, i) => (
            <circle
              key={i}
              cx={i * 10 - 4}
              cy={80 + (i % 2) * 9}
              r={3}
              fill={i % 3 === 0 ? C.sun : i % 3 === 1 ? C.paper : C.ll}
              opacity={0.9}
            />
          ))}
      </>
    ),
    mid: (
      <>
        <rect x={-20} y={106} width={360} height={20} fill={C.dd} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={i * 60 - 10} y={110} width={30} height={12} rx={2} fill={i % 2 ? C.sun : C.paper} opacity={0.85} />
        ))}
      </>
    ),
    near: (
      <>
        <rect x={-20} y={124} width={360} height={70} fill={C.m} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={-20 + i * 80} y={124} width={40} height={70} fill={C.d} opacity={0.35} />
        ))}
        <ellipse cx={160} cy={166} rx={50} ry={14} fill="none" stroke={C.paper} strokeWidth={2} opacity={0.8} />
        <path d="M160 152V180" stroke={C.paper} strokeWidth={2} opacity={0.8} />
      </>
    ),
    front: (
      <>
        <path d="M96 140 Q160 -20 224 140" stroke={C.paper} strokeWidth={2.5} strokeDasharray="3 6" strokeLinecap="round" fill="none" opacity={0.85} />
        <text x={150} y={72} fontSize={22} className="nx-float">⚽</text>
      </>
    ),
  };
}

function construction(detail: boolean): Art {
  const blocks: [number, number, number][] = [[-12, 34, 62], [26, 24, 84], [54, 36, 52], [92, 22, 70], [226, 30, 66], [300, 34, 80]];
  return {
    sky: [C.ll, C.l],
    backdrop: (
      <g className="nx-drift" style={v({ '--dx': '30px', '--drift-s': '40s' })} fill={C.paper} opacity={0.8}>
        <ellipse cx={60} cy={30} rx={24} ry={7} />
        <ellipse cx={200} cy={22} rx={20} ry={6} />
      </g>
    ),
    far: (
      <>
        {blocks.map(([x, w, h], i) => (
          <g key={x}>
            <rect x={x} y={136 - h} width={w} height={h} fill={C.l} />
            {detail &&
              [0, 1, 2].map((r) => (
                <rect key={r} x={x + 5} y={136 - h + 8 + r * 14} width={w - 10} height={4} fill={C.ll} opacity={i % 2 ? 0.9 : 0.6} />
              ))}
          </g>
        ))}
      </>
    ),
    mid: (
      <>
        <rect x={246} y={22} width={8} height={116} fill={C.sun} />
        <path d="M246 130 L254 112 L246 94 L254 76 L246 58 L254 40 L246 22 M254 130 L246 112 L254 94 L246 76 L254 58 L246 40 L254 22" stroke={C.dd} strokeWidth={1.2} fill="none" />
        <rect x={140} y={20} width={150} height={6} fill={C.sun} />
        <rect x={276} y={26} width={18} height={12} fill={C.dd} />
        <rect x={238} y={16} width={22} height={12} rx={2} fill={C.dd} />
      </>
    ),
    near: (
      <>
        <rect x={-20} y={134} width={360} height={60} fill={C.d} />
        <rect x={-20} y={134} width={360} height={4} fill={C.dd} />
        {[84, 104].map((x) => (
          <g key={x}>
            <rect x={x} y={140} width={26} height={5} fill={C.sun} />
            <rect x={x + 2} y={133} width={22} height={5} fill={C.sun} />
          </g>
        ))}
        <path d="M222 148 l7 -16 l7 16Z" fill={C.sun} />
        <rect x={224} y={142} width={10} height={3} fill={C.paper} />
      </>
    ),
    front: (
      <g className="nx-wobble" style={{ transformBox: 'fill-box', transformOrigin: '50% 0' }}>
        <path d="M168 26V62" stroke={C.ink} strokeWidth={1.4} />
        <path d="M168 62 q-4 0 -4 4" stroke={C.ink} strokeWidth={2} fill="none" />
        <rect x={146} y={66} width={44} height={6} fill={C.dd} />
        <rect x={152} y={72} width={32} height={3} fill={C.dd} />
      </g>
    ),
  };
}

function medecine(detail: boolean): Art {
  return {
    sky: [C.ll, C.l],
    backdrop: (
      <>
        <polyline
          points="-10,50 80,50 92,50 100,28 110,70 118,50 150,50 160,50 168,36 176,58 184,50 340,50"
          stroke={C.paper}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.85}
        />
        <text x={124} y={42} fontSize={18} className="nx-pulse" style={FB}>❤️</text>
      </>
    ),
    far: (
      <>
        <rect x={190} y={66} width={104} height={72} rx={4} fill={C.paper} />
        <rect x={184} y={58} width={116} height={11} rx={3} fill={C.d} />
        <path d="M237 74 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 v-8 h8z" fill={C.m} />
        <rect x={198} y={100} width={18} height={16} rx={2} fill={C.l} />
        <rect x={228} y={108} width={20} height={30} rx={3} fill={C.l} />
        <rect x={262} y={100} width={18} height={16} rx={2} fill={C.l} />
      </>
    ),
    mid: (
      <>
        <ellipse cx={72} cy={134} rx={26} ry={10} fill={C.m} />
        <ellipse cx={300} cy={134} rx={22} ry={9} fill={C.m} />
      </>
    ),
    near: (
      <>
        <rect x={-20} y={136} width={360} height={60} fill={C.d} />
        <path d="M228 138 L210 190 H270 L252 138Z" fill={C.ll} opacity={0.7} />
      </>
    ),
    front: (
      <>
        {(detail
          ? [[100, 96], [76, 84], [138, 76], [112, 120], [60, 112]]
          : [[104, 98], [140, 80], [114, 122]]
        ).map(([x, y], i) => (
          <path
            key={i}
            transform={`translate(${x} ${y})`}
            d="M-2 -7 h4 v5 h5 v4 h-5 v5 h-4 v-5 h-5 v-4 h5z"
            fill={i % 2 ? C.paper : C.sun}
            className="nx-float"
            style={FLOAT_DELAY(i)}
          />
        ))}
      </>
    ),
  };
}

function science(detail: boolean): Art {
  const orbit = [0, 60, 120];
  return {
    sky: [C.l, C.m],
    backdrop: (
      <>
        <path d="M0 40H320M0 80H320M60 0V110M130 0V110M200 0V110M270 0V110" stroke={C.paper} strokeWidth={1} opacity={0.25} />
        <g transform="translate(230 62)">
          <circle r={5} fill={C.sun} />
          {orbit.map((a) => (
            <ellipse key={a} rx={32} ry={11} transform={`rotate(${a})`} fill="none" stroke={C.paper} strokeWidth={1.8} opacity={0.85} />
          ))}
          {detail && (
            <g className="nx-swirl">
              <circle cx={32} r={3.4} fill={C.paper} />
            </g>
          )}
          <circle cx={-16} cy={-9} r={3} fill={C.paper} className="nx-twinkle" />
          <circle cx={16} cy={9} r={3} fill={C.paper} className="nx-twinkle" style={idx(2)} />
        </g>
      </>
    ),
    far: <rect x={-20} y={104} width={360} height={30} fill={C.d} opacity={0.5} />,
    mid: null,
    near: (
      <>
        <rect x={-20} y={132} width={360} height={60} fill={C.dd} />
        <rect x={-20} y={128} width={360} height={6} fill={C.ll} />
      </>
    ),
    front: (
      <>
        {[
          { x: 108, liquid: 'var(--beat-success)' },
          { x: 214, liquid: 'var(--beat-surprise)' },
        ].map(({ x, liquid }, k) => (
          <g key={x} transform={`translate(${x} 128)`}>
            <path d="M-6 -34 h12 v16 l16 18 h-44 l16 -18z" fill={C.paper} opacity={0.35} />
            <path d="M-13 -9 l-9 9 h44 l-9 -9z" fill={liquid} />
            <path d="M-6 -34 h12 v16 l16 18 h-44 l16 -18z" fill="none" stroke={C.paper} strokeWidth={2} strokeLinejoin="round" />
            {[-5, 3, 9].map((bx, i) => (
              <circle key={bx} cx={bx} cy={-12} r={2.4} fill={C.paper} className="nx-rise-up" style={idx(i + k)} />
            ))}
          </g>
        ))}
      </>
    ),
  };
}

const ROWS = 5;
const COLS = 8;
const HORIZON = 92;
function rowY(r: number) {
  return HORIZON + 90 * (r / ROWS) ** 1.5;
}
function halfWidth(y: number) {
  return 56 + (y - HORIZON) * 2.6;
}
const CELLS = Array.from({ length: ROWS * COLS }, (_, n) => {
  const r = Math.floor(n / COLS);
  const c = n % COLS;
  const y0 = rowY(r);
  const y1 = rowY(r + 1);
  const pt = (y: number, col: number) => `${160 - halfWidth(y) + (col * 2 * halfWidth(y)) / COLS},${y}`;
  return { n, r, c, points: `${pt(y0, c)} ${pt(y0, c + 1)} ${pt(y1, c + 1)} ${pt(y1, c)}` };
});

function echecs(detail: boolean): Art {
  const glow = new Set([10, 21, 33]);
  return {
    sky: [C.dd, C.d],
    backdrop: (
      <>
        {(detail ? STARS.slice(0, 9) : STARS.slice(0, 5)).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y * 0.8} r={1.5} fill={C.paper} className="nx-twinkle" style={idx(i)} />
        ))}
        <circle cx={160} cy={96} r={80} fill={C.m} opacity={0.35} />
      </>
    ),
    far: null,
    mid: null,
    near: (
      <>
        <rect x={-20} y={HORIZON} width={360} height={100} fill={C.dd} />
        {CELLS.map((cell) => (
          <polygon
            key={cell.n}
            points={cell.points}
            fill={glow.has(cell.n) ? C.sun : (cell.r + cell.c) % 2 ? C.dd : C.ll}
            opacity={glow.has(cell.n) ? 0.9 : 1}
            className={glow.has(cell.n) ? 'nx-twinkle' : undefined}
            style={glow.has(cell.n) ? idx(cell.n % 5) : undefined}
          />
        ))}
      </>
    ),
    front: (
      <>
        <text x={88} y={140} fontSize={44} textAnchor="middle" fill={C.paper} stroke={C.ink} strokeWidth={1.4} className="nx-float">♜</text>
        <text x={234} y={140} fontSize={44} textAnchor="middle" fill={C.ink} stroke={C.paper} strokeWidth={1.4} className="nx-float" style={FLOAT_DELAY(2)}>♝</text>
      </>
    ),
  };
}

const BUILD: Record<WorldId, (detail: boolean) => Art> = {
  nature, espace, cuisine, sport, construction, medecine, science, echecs,
};

export function buildArt(world: WorldId, detail: boolean): Art {
  return BUILD[world](detail);
}
