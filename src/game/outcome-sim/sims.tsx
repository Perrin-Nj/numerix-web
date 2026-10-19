import type { CSSProperties, ReactNode } from 'react';
import type { WorldId } from '@/data/api/types';

// Every animated part uses the nx-sim classes: the base style is the END state, so reduced motion
// and tap-to-skip both land on the finished picture. Offsets below describe where the part STARTS.
type A = { fx?: number; fy?: number; fs?: number; fsy?: number; fr?: number; fo?: number; d?: number; dl?: number; e?: string; to?: string; t?: string };
const a = ({ fx, fy, fs, fsy, fr, fo, d, dl, e, to, t }: A): CSSProperties => {
  const v: Record<string, string> = {};
  if (fx !== undefined) v['--fx'] = `${fx}px`;
  if (fy !== undefined) v['--fy'] = `${fy}px`;
  if (fs !== undefined) v['--fs'] = `${fs}`;
  if (fsy !== undefined) v['--fsy'] = `${fsy}`;
  if (fr !== undefined) v['--fr'] = `${fr}deg`;
  if (fo !== undefined) v['--fo'] = `${fo}`;
  if (d !== undefined) v['--d'] = `${d}ms`;
  if (dl !== undefined) v['--dl'] = `${dl}ms`;
  if (e !== undefined) v['--e'] = e;
  if (to !== undefined) v['--to'] = to;
  return { ...v, ...(t ? { transform: t } : {}) } as CSSProperties;
};
const del = (dl: number): CSSProperties => ({ '--dl': `${dl}ms` }) as CSSProperties;

type P = { x: number; y: number; size?: number; children: string; cls?: string; style?: CSSProperties };
const Em = ({ x, y, size = 24, children, cls, style }: P) => (
  <text x={x} y={y} fontSize={size} textAnchor="middle" className={cls} style={style}>
    {children}
  </text>
);

const Bg = ({ sky, gy, ground, h = 180 }: { sky: string; gy?: number; ground?: string; h?: number }) => (
  <>
    <rect width={320} height={h} fill={sky} />
    {gy !== undefined && <rect y={gy} width={320} height={h - gy} fill={ground} />}
  </>
);

const Puff = ({ x, y, r = 10, dl, fill = '#e2e8f0' }: { x: number; y: number; r?: number; dl: number; fill?: string }) => (
  <circle cx={x} cy={y} r={r} fill={fill} className="nx-sim-puff" style={del(dl)} />
);

function Truss({ x0, x1 }: { x0: number; x1: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <>
      <rect x={x0} y={92} width={x1 - x0} height={10} fill="#475569" />
      <polyline points={`${x0 + 2},92 ${(x0 + mid) / 2},62 ${mid},92 ${(mid + x1) / 2},62 ${x1 - 2},92`} fill="none" stroke="#f59e0b" strokeWidth={4} strokeLinejoin="round" />
    </>
  );
}

function Rocket({ flame }: { flame?: ReactNode }) {
  return (
    <>
      {flame}
      <path d="M0 -22 C10 -12 10 8 7 16 L-7 16 C-10 8 -10 -12 0 -22Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
      <path d="M-7 6 L-15 18 L-7 14Z M7 6 L15 18 L7 14Z" fill="#fb7185" />
      <circle cy={-6} r={3.5} fill="#38bdf8" />
    </>
  );
}
const Flame = ({ out }: { out?: boolean }) => (
  <ellipse cy={24} rx={4.5} ry={8} fill="#fb923c" className={out ? 'nx-sim-out' : 'nx-twinkle'} style={out ? a({ d: 1800, dl: 100 }) : undefined} />
);

const stars: [number, number][] = [[30, 24], [80, 50], [140, 20], [200, 40], [250, 22], [290, 60], [60, 100], [300, 110]];
const Stars = () => (
  <>
    {stars.map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={1.8} fill="#fff" className="nx-twinkle" style={{ animationDelay: `${i * 260}ms` }} />
    ))}
  </>
);

function Flower({ x, y, color, center = '#facc15' }: { x: number; y: number; color: string; center?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <circle key={r} cx={0} cy={-8} r={6.5} fill={color} transform={`rotate(${r})`} />
      ))}
      <circle r={5} fill={center} />
    </g>
  );
}

const Crowd = ({ emoji }: { emoji: string }) => (
  <>
    {[40, 90, 140, 190, 240, 285].map((x, i) => (
      <Em key={x} x={x} y={172} size={22} cls="nx-bounce" style={{ animationDelay: `${1300 + i * 90}ms` }}>
        {emoji}
      </Em>
    ))}
  </>
);

const Bubbles = ({ n, out }: { n: number; out?: boolean }) => (
  <>
    {[140, 160, 180, 150, 170].slice(0, n).map((x, i) => (
      <circle
        key={x}
        cx={x}
        cy={120}
        r={4}
        fill="#fff"
        opacity={0.85}
        className={out ? 'nx-sim-out' : 'nx-rise-up'}
        style={out ? a({ d: 700, dl: i * 150 }) : ({ '--i': i } as CSSProperties)}
      />
    ))}
  </>
);

const Beaker = ({ liquid, fill, children }: { liquid: ReactNode; fill: string; children?: ReactNode }) => (
  <>
    <rect y={140} width={320} height={40} fill="#c4b5fd" />
    {liquid}
    <path d="M130 50 H190 V56 L205 128 Q207 140 195 140 H125 Q113 140 115 128 L130 56 Z" fill={fill} stroke="#64748b" strokeWidth={3} strokeLinejoin="round" />
    {children}
  </>
);

const SQ = ['#f1d9b5', '#b58863'];
function Board({ children }: { children: ReactNode }) {
  return (
    <>
      <rect width={320} height={180} fill="#e9d5ff" />
      {Array.from({ length: 24 }, (_, k) => (
        <rect key={k} x={40 + (k % 6) * 40} y={10 + Math.floor(k / 6) * 40} width={40} height={40} fill={SQ[((k % 6) + Math.floor(k / 6)) % 2]} />
      ))}
      {children}
    </>
  );
}
const W = { fill: '#fff', stroke: '#1e293b', strokeWidth: 1.5 };
const K = { fill: '#1e293b' };
const Piece = ({ x, y, g, dark, cls, style }: { x: number; y: number; g: string; dark?: boolean; cls?: string; style?: CSSProperties }) => (
  <text x={x} y={y + 12} fontSize={36} textAnchor="middle" {...(dark ? K : W)} className={cls} style={style}>
    {g}
  </text>
);

export type SimScene = { good: ReactNode; bad: ReactNode };

const construction: SimScene = {
  good: (
    <>
      <Bg sky="#bde3ff" gy={140} ground="#5aa9e6" />
      <rect x={30} y={100} width={28} height={80} fill="#94a3b8" />
      <rect x={262} y={100} width={28} height={80} fill="#94a3b8" />
      <g className="nx-sim" style={a({ fy: -26, fo: 0, d: 500 })}>
        <Truss x0={30} x1={290} />
      </g>
      <g transform="translate(0 0)">
        <Em x={248} y={90} size={30} cls="nx-sim" style={a({ fx: -230, d: 2200, dl: 300, e: 'linear' })}>
          🚚
        </Em>
      </g>
    </>
  ),
  bad: (
    <g className="nx-sim-shake" style={del(700)}>
      <Bg sky="#cfd8e3" gy={140} ground="#5aa9e6" />
      <rect x={30} y={100} width={28} height={80} fill="#94a3b8" />
      <rect x={262} y={100} width={28} height={80} fill="#94a3b8" />
      <rect x={30} y={92} width={28} height={10} fill="#475569" />
      <rect x={262} y={92} width={28} height={10} fill="#475569" />
      <Em x={22} y={90} size={28}>
        🚚
      </Em>
      <g className="nx-sim" style={a({ d: 900, dl: 600, e: 'ease-in', t: 'translateY(26px) rotate(18deg)' })}>
        <Truss x0={58} x1={110} />
      </g>
      <g className="nx-sim" style={a({ d: 900, dl: 750, e: 'ease-in', t: 'translateY(56px) rotate(-6deg)' })}>
        <Truss x0={110} x1={210} />
      </g>
      <g className="nx-sim" style={a({ d: 900, dl: 900, e: 'ease-in', t: 'translateY(26px) rotate(-18deg)' })}>
        <Truss x0={210} x1={262} />
      </g>
      <polyline points="110,92 106,98 112,102 108,110" fill="none" stroke="#1e293b" strokeWidth={2} className="nx-sim" style={a({ fo: 0, d: 200, dl: 350 })} />
      <Puff x={80} y={138} dl={1300} />
      <Puff x={160} y={148} r={13} dl={1450} />
      <Puff x={240} y={138} dl={1600} />
    </g>
  ),
};

const nature: SimScene = {
  good: (
    <>
      <Bg sky="#d9f2ff" gy={130} ground="#8b5a2b" />
      <rect y={126} width={320} height={7} fill="#5fb35a" />
      <Em x={40} y={44} size={30}>
        ☀️
      </Em>
      <rect x={158} y={78} width={4} height={50} fill="#3f9d45" className="nx-sim" style={a({ fsy: 0.1, to: 'center bottom', d: 900 })} />
      <ellipse cx={148} cy={102} rx={11} ry={5} fill="#5fc15f" transform="rotate(-30 148 102)" className="nx-sim" style={a({ fs: 0, d: 400, dl: 700 })} />
      <ellipse cx={172} cy={94} rx={11} ry={5} fill="#5fc15f" transform="rotate(30 172 94)" className="nx-sim" style={a({ fs: 0, d: 400, dl: 850 })} />
      <g className="nx-sim" style={a({ fs: 0, d: 600, dl: 1300, e: 'cubic-bezier(.3,1.5,.5,1)' })}>
        <Flower x={160} y={74} color="#f9a8d4" />
      </g>
      <Em x={210} y={70} size={20} cls="nx-sim" style={a({ fx: 90, fo: 0, d: 800, dl: 1700 })}>
        🐝
      </Em>
      <Em x={112} y={58} size={18} cls="nx-sim" style={a({ fx: -80, fo: 0, d: 800, dl: 1900 })}>
        🐝
      </Em>
    </>
  ),
  bad: (
    <>
      <Bg sky="#f5e9cf" gy={130} ground="#c9a36b" />
      <path d="M20 140 l22 8 l-6 10 M110 136 l18 12 l14 -4 M220 142 l24 6 l10 14 M270 134 l-12 14" fill="none" stroke="#7c5a2b" strokeWidth={2} pathLength={1} className="nx-sim-draw" style={a({ d: 700 })} />
      <g className="nx-sim" style={a({ d: 1600, to: '50% 100%', t: 'rotate(34deg)' })}>
        <rect x={158} y={78} width={4} height={50} fill="#a3a041" />
        <ellipse cx={148} cy={104} rx={10} ry={4} fill="#b5a642" transform="rotate(20 148 104)" />
        <Flower x={160} y={74} color="#d6c3a8" center="#b08d57" />
      </g>
      <g className="nx-sim" style={a({ fo: 0, fy: -14, d: 500, dl: 1500 })}>
        <ellipse cx={226} cy={38} rx={22} ry={11} fill="#cbd5e1" />
        <ellipse cx={210} cy={44} rx={14} ry={8} fill="#cbd5e1" />
      </g>
      <Em x={190} y={96} size={16} cls="nx-sim" style={a({ fy: -50, fo: 0, d: 600, dl: 2000, e: 'ease-in' })}>
        💧
      </Em>
      <Em x={214} y={124} size={22} cls="nx-sim" style={a({ fs: 0, d: 400, dl: 2500 })}>
        🌱
      </Em>
    </>
  ),
};

const espace: SimScene = {
  good: (
    <>
      <Bg sky="#0f172a" />
      <Stars />
      <ellipse cx={160} cy={205} rx={200} ry={62} fill="#cbd5e1" />
      <circle cx={70} cy={150} r={6} fill="#94a3b8" />
      <circle cx={250} cy={156} r={8} fill="#94a3b8" />
      <rect x={140} y={146} width={40} height={5} rx={2} fill="#64748b" />
      <g transform="translate(160 124)">
        <g className="nx-sim" style={a({ fy: -110, d: 1800, dl: 100, e: 'cubic-bezier(.2,.7,.3,1)' })}>
          <Rocket flame={<Flame out />} />
        </g>
      </g>
      <g className="nx-sim" style={a({ fs: 0, to: 'center bottom', d: 400, dl: 2000 })}>
        <line x1={206} y1={146} x2={206} y2={116} stroke="#e2e8f0" strokeWidth={2} />
        <path d="M206 116 L226 122 L206 128Z" fill="#fbbf24" />
      </g>
      <Em x={118} y={96} size={16} cls="nx-twinkle">
        ✨
      </Em>
      <Em x={214} y={86} size={14} cls="nx-twinkle" style={{ animationDelay: '300ms' }}>
        ✨
      </Em>
    </>
  ),
  bad: (
    <>
      <Bg sky="#0f172a" />
      <Stars />
      <ellipse cx={160} cy={205} rx={200} ry={62} fill="#cbd5e1" />
      <rect x={60} y={146} width={40} height={5} rx={2} fill="#64748b" />
      <circle cx={190} cy={80} r={30} fill="#fb7185" />
      <ellipse cx={190} cy={80} rx={48} ry={9} fill="none" stroke="#fde68a" strokeWidth={3} transform="rotate(-20 190 80)" />
      <g transform="translate(268 34) rotate(55) scale(.7)">
        <g className="nx-sim" style={a({ fx: -208, fy: 90, fr: -55, d: 2400, e: 'ease-in-out' })}>
          <Rocket flame={<Flame />} />
        </g>
      </g>
    </>
  ),
};

const cuisine: SimScene = {
  good: (
    <>
      <Bg sky="#fff1d6" gy={130} ground="#c58b5a" />
      <Em x={50} y={128} size={38}>
        🧑‍🍳
      </Em>
      <ellipse cx={160} cy={132} rx={68} ry={8} fill="#f8fafc" />
      <g className="nx-sim" style={a({ fsy: 0.4, to: 'center bottom', d: 1400 })}>
        <rect x={116} y={88} width={88} height={42} rx={8} fill="#f3b53f" />
        <rect x={112} y={78} width={96} height={16} rx={8} fill="#f9d56e" />
      </g>
      <Em x={160} y={70} size={20} cls="nx-sim" style={a({ fs: 0, d: 300, dl: 1500 })}>
        🍒
      </Em>
      <Em x={108} y={72} size={16} cls="nx-twinkle">
        ✨
      </Em>
      <Em x={214} y={78} size={16} cls="nx-twinkle" style={{ animationDelay: '400ms' }}>
        ✨
      </Em>
    </>
  ),
  bad: (
    <>
      <Bg sky="#fff1d6" gy={130} ground="#c58b5a" />
      <Em x={50} y={128} size={38}>
        🧑‍🍳
      </Em>
      <ellipse cx={160} cy={132} rx={68} ry={8} fill="#f8fafc" />
      <g className="nx-sim" style={a({ fsy: 2.6, to: 'center bottom', d: 1000, dl: 300, e: 'ease-in' })}>
        <rect x={116} y={114} width={88} height={16} rx={6} fill="#d9a066" />
        <ellipse cx={160} cy={114} rx={44} ry={6} fill="#b8793f" />
      </g>
      <Puff x={150} y={104} dl={1000} fill="#9ca3af" />
      <Puff x={172} y={92} r={12} dl={1250} fill="#9ca3af" />
      <Puff x={192} y={100} dl={1500} fill="#9ca3af" />
    </>
  ),
};

const Goal = () => (
  <>
    <g stroke="#fff" strokeOpacity={0.5} strokeWidth={1}>
      {[240, 258, 276].map((x) => (
        <line key={x} x1={x} y1={60} x2={x} y2={112} />
      ))}
      {[76, 92].map((y) => (
        <line key={y} x1={222} y1={y} x2={300} y2={y} />
      ))}
    </g>
    <path d="M222 112 V60 H300 V112" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
  </>
);
const sport: SimScene = {
  good: (
    <>
      <Bg sky="#bfe6ff" gy={112} ground="#4caf50" />
      <g className="nx-sim" style={a({ fs: 1.07, d: 300, dl: 1200 })}>
        <Goal />
      </g>
      <Em x={262} y={104} size={22} cls="nx-sim" style={a({ fx: -210, fy: 50, fr: -540, d: 1100, dl: 200 })}>
        ⚽
      </Em>
      <Crowd emoji="🙌" />
    </>
  ),
  bad: (
    <>
      <Bg sky="#bfe6ff" gy={112} ground="#4caf50" />
      <Goal />
      <g className="nx-sim-out" style={a({ d: 700, dl: 200 })}>
        <Em x={216} y={86} size={22} cls="nx-sim" style={a({ fx: -176, fy: 80, fr: -360, d: 700, dl: 200 })}>
          ⚽
        </Em>
      </g>
      <Em x={222} y={70} size={14} cls="nx-sim-puff" style={del(880)}>
        ✨
      </Em>
      <Em x={150} y={134} size={22} cls="nx-sim" style={a({ fx: 66, fy: -48, fo: 0, fr: 300, d: 700, dl: 900, e: 'ease-in' })}>
        ⚽
      </Em>
      <Crowd emoji="👏" />
    </>
  ),
};

const Monitor = ({ path, color, heart, children }: { path: string; color: string; heart: string; children?: ReactNode }) => (
  <>
    <rect width={320} height={180} fill="#e6fffa" />
    <rect x={30} y={30} width={160} height={100} rx={10} fill="#0f172a" stroke="#94a3b8" strokeWidth={3} />
    <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="nx-sim-draw" style={a({ d: 1500 })} />
    <Em x={170} y={52} size={16} cls="nx-heart">
      {heart}
    </Em>
    <rect x={205} y={118} width={100} height={24} rx={6} fill="#94a3b8" />
    <rect x={207} y={104} width={26} height={16} rx={7} fill="#e2e8f0" />
    <circle cx={226} cy={102} r={17} fill="#fcd9b6" />
    <circle cx={220} cy={99} r={2} fill="#1e293b" />
    <circle cx={232} cy={99} r={2} fill="#1e293b" />
    {children}
  </>
);
const medecine: SimScene = {
  good: (
    <Monitor path="M42 90 H70 L78 70 L88 108 L98 60 L106 90 H132 L140 70 L150 108 L160 60 L168 90 H180" color="#34d399" heart="💚">
      <path d="M219 108 Q226 115 233 108" fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round" className="nx-sim" style={a({ fo: 0, d: 400, dl: 1600 })} />
      <Em x={262} y={92} size={18} cls="nx-twinkle">
        ✨
      </Em>
    </Monitor>
  ),
  bad: (
    <Monitor path="M42 90 H60 L68 74 L76 104 L84 66 L94 100 L102 80 L114 96 L124 86 L138 94 H180" color="#fbbf24" heart="💛">
      <path d="M219 111 Q226 107 233 111" fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round" />
      <path d="M219 108 Q226 115 233 108" fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round" className="nx-sim" style={a({ fo: 0, d: 400, dl: 2300 })} />
      <Em x={274} y={90} size={38} cls="nx-sim" style={a({ fx: 60, fo: 0, d: 700, dl: 1100 })}>
        🧑‍⚕️
      </Em>
      <Em x={246} y={66} size={20} cls="nx-sim" style={a({ fs: 0, d: 400, dl: 1800 })}>
        🫶
      </Em>
    </Monitor>
  ),
};

const science: SimScene = {
  good: (
    <>
      <rect width={320} height={180} fill="#ede9fe" />
      <circle cx={160} cy={100} r={62} fill="#99f6e4" opacity={0.4} className="nx-sim" style={a({ fs: 0, d: 700, dl: 800 })} />
      <Beaker
        fill="rgba(255,255,255,.45)"
        liquid={<path d="M121 96 H199 L205 128 Q207 138 195 138 H125 Q113 138 115 128 Z" fill="#5eead4" className="nx-sim" style={a({ fsy: 0.2, to: 'center bottom', d: 700 })} />}
      >
        <Bubbles n={5} />
      </Beaker>
      <Em x={118} y={60} size={18} cls="nx-twinkle">
        ✨
      </Em>
      <Em x={208} y={50} size={14} cls="nx-twinkle" style={{ animationDelay: '300ms' }}>
        ✨
      </Em>
    </>
  ),
  bad: (
    <>
      <rect width={320} height={180} fill="#ede9fe" />
      <Beaker fill="rgba(255,255,255,.45)" liquid={<path d="M118 112 H202 L205 128 Q207 138 195 138 H125 Q113 138 115 128 Z" fill="#94a3b8" />}>
        <Bubbles n={3} out />
      </Beaker>
      <Em x={160} y={42} size={22} cls="nx-sim" style={a({ fs: 0, d: 300, dl: 1500 })}>
        💥
      </Em>
      <Puff x={150} y={40} dl={1600} fill="#d4d4d8" />
      <Puff x={176} y={36} dl={1750} fill="#d4d4d8" />
    </>
  ),
};

const echecs: SimScene = {
  good: (
    <Board>
      <Piece x={60} y={30} g="♚︎" dark cls="nx-sim" style={a({ d: 500, dl: 600, t: 'rotate(28deg)' })} />
      <Piece x={100} y={70} g="♕︎" />
      <Piece x={220} y={110} g="♔︎" />
      <rect x={80} y={50} width={40} height={40} fill="#fde68a" opacity={0.5} />
      <Em x={100} y={48} size={22} cls="nx-sim" style={a({ fy: -70, fo: 0, d: 600, dl: 900, e: 'cubic-bezier(.3,1.4,.5,1)' })}>
        👑
      </Em>
      <Em x={140} y={34} size={16} cls="nx-twinkle">
        ✨
      </Em>
    </Board>
  ),
  bad: (
    <Board>
      {[[100, 30], [180, 30], [60, 70], [220, 70], [60, 150]].map(([x, y]) => (
        <Piece key={`${x}${y}`} x={x} y={y} g="♟︎" dark />
      ))}
      <rect x={200} y={130} width={40} height={40} fill="#86efac" opacity={0.6} className="nx-sim" style={a({ fo: 0, d: 400, dl: 1900 })} />
      <path d="M140 110 H220 V150" fill="none" stroke="#16a34a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="nx-sim-draw" style={a({ d: 900, dl: 1100 })} />
      <Piece x={140} y={110} g="♘︎" cls="nx-wobble" />
      <Em x={232} y={140} size={16} cls="nx-twinkle">
        ✨
      </Em>
    </Board>
  ),
};

/** The eight original worlds have their own drawn animation; the others share this neutral one, drawn with their emoji. */
export const LEGACY_WORLDS = ['construction', 'nature', 'espace', 'cuisine', 'sport', 'medecine', 'science', 'echecs'] as const;
export const isLegacyWorld = (w: WorldId) => (LEGACY_WORLDS as readonly string[]).includes(w);

function generic(emoji: string): SimScene {
  return {
    good: (
      <>
        <Bg sky="#fef3c7" gy={130} ground="#86efac" />
        <Em x={160} y={112} size={64} cls="nx-float">
          {emoji}
        </Em>
        <Em x={96} y={70} size={22} cls="nx-twinkle">
          ✨
        </Em>
        <Em x={226} y={64} size={22} cls="nx-twinkle" style={del(300)}>
          ✨
        </Em>
        <Em x={200} y={150} size={18} cls="nx-twinkle" style={del(600)}>
          ⭐
        </Em>
      </>
    ),
    bad: (
      <>
        <Bg sky="#e0e7ff" gy={130} ground="#cbd5e1" />
        <Em x={160} y={116} size={56} cls="nx-wobble">
          {emoji}
        </Em>
        <Em x={232} y={56} size={26} cls="nx-float">
          ☁️
        </Em>
        <Em x={92} y={150} size={16} cls="nx-twinkle">
          ·
        </Em>
      </>
    ),
  };
}

export const SCENES: Record<WorldId, SimScene> = {
  construction, nature, espace, cuisine, sport, medecine, science, echecs,
  ocean: generic('🐠'), dinosaures: generic('🦕'), animaux: generic('🦊'), musique: generic('🎵'), transport: generic('🚂'),
  pirates: generic('🏴‍☠️'), marche: generic('🛒'), meteo: generic('⛅'), robots: generic('🤖'), arts: generic('🎨'),
  hiver: generic('⛄'), jeux: generic('🎲'),
};
