import { useId } from 'react';
import type { Art } from './art';

const hsl = (h: number, s: number, l: number, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;
const SKY: ((h: number) => [string, string])[] = [
  (h) => [hsl(h, 80, 78), hsl(h + 30, 85, 92)],
  (h) => [hsl(h, 60, 40), hsl(h + 40, 70, 70)],
  (h) => [hsl(h + 20, 75, 62), hsl(h - 20, 80, 85)],
  (h) => [hsl(h, 45, 22), hsl(h + 30, 60, 48)],
];
const STAR = 'M0 -1 L0.3 -0.3 L1 0 L0.3 0.3 L0 1 L-0.3 0.3 L-1 0 L-0.3 -0.3Z';

function Text({ g, x, y, size, rot }: { g: string; x: number; y: number; size: number; rot: number }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor="middle" dominantBaseline="central" transform={`rotate(${rot} ${x} ${y})`}>
      {g}
    </text>
  );
}

/** Chapter art: a little scene from the world, composed from the card id. */
export function PostcardArt({ art }: { art: Art }) {
  const id = useId().replace(/:/g, '');
  const [top, bottom] = SKY[art.sky](art.hue);
  const ground = hsl(art.hue2, 45, art.sky === 3 ? 18 : 38);
  const ground2 = hsl(art.hue2, 50, art.sky === 3 ? 26 : 52);
  const horizon = [
    'M0 86 Q25 70 50 84 T100 78 V120 H0Z',
    'M0 82 Q12 76 25 82 T50 82 T75 82 T100 82 V120 H0Z',
    'M0 90 H30 V78 H60 V86 H100 V120 H0Z',
  ][art.horizon];
  return (
    <svg viewBox="0 0 100 120" className="size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="120" fill={`url(#s${id})`} />
      {art.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={art.sky === 3 || art.sky === 1 ? 0.9 : 0.5} />
      ))}
      {art.stars.slice(1).map((s, i) => (
        <line key={i} x1={art.stars[i].x} y1={art.stars[i].y} x2={s.x} y2={s.y} stroke="#fff" strokeOpacity="0.25" strokeWidth="0.4" />
      ))}
      <circle cx={art.sun.x} cy={art.sun.y} r="9" fill={art.sun.moon ? '#f4f1de' : '#ffe27a'} opacity="0.95" />
      {art.sun.moon && <circle cx={art.sun.x + 3} cy={art.sun.y - 2} r="8" fill={top} />}
      <path d={horizon} fill={ground2} transform="translate(0 -6)" opacity="0.8" />
      <path d={horizon} fill={ground} />
      {art.glyphs.map((g, i) => (
        <Text key={i} {...g} y={g.y + 14} />
      ))}
      <Text {...art.hero} />
    </svg>
  );
}

const METAL = {
  gold: ['#fff3b0', '#d99a1e', '#b9770e'],
  silver: ['#ffffff', '#9aa5b1', '#6b7785'],
  bronze: ['#ffd9b0', '#b8672a', '#8a4a1a'],
} as const;
export const metalGradient = (m: Art['metal']) => `conic-gradient(from 20deg, ${METAL[m][0]}, ${METAL[m][1]}, ${METAL[m][0]}, ${METAL[m][2]}, ${METAL[m][0]})`;

/** Challenge art: sunrays and an embossed emblem, no world scene. */
export function BadgeArt({ art, spin }: { art: Art; spin: boolean }) {
  const id = useId().replace(/:/g, '');
  const rays = Array.from({ length: art.rays }, (_, i) => {
    const a = (i / art.rays) * 360;
    return <path key={i} d="M50 50 L44 -10 L56 -10Z" transform={`rotate(${a} 50 50)`} fill={hsl(art.hue2, 90, 80, 0.35)} />;
  });
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <defs>
        <radialGradient id={`b${id}`} cx="50%" cy="45%" r="70%">
          <stop offset="0" stopColor={hsl(art.hue, 85, 70)} />
          <stop offset="1" stopColor={hsl(art.hue, 75, 30)} />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#b${id})`} />
      <g className={spin ? 'nx-card-spin' : undefined} style={{ transformOrigin: '50px 50px' }}>
        {rays}
      </g>
      {art.stars.map((s, i) => (
        <path key={i} d={STAR} transform={`translate(${s.x} ${s.y}) scale(${s.r * 2.2})`} fill="#fff" opacity="0.7" />
      ))}
      <circle cx="50" cy="50" r="27" fill={hsl(art.hue, 70, 25, 0.55)} />
      <circle cx="50" cy="50" r="27" fill="none" stroke="#ffffffaa" strokeWidth="1.2" strokeDasharray="1.5 3" />
    </svg>
  );
}

/** Gift art: confetti, ribbon curls, stars and bursts on wrapping paper. */
export function PresentArt({ art }: { art: Art }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 100" className="size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id={`p${id}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform={`rotate(${art.corner * 15 + 20})`}>
          <rect width="12" height="12" fill={hsl(art.hue, 75, 52)} />
          <rect width="6" height="12" fill={hsl(art.hue2, 80, 58)} opacity="0.55" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#p${id})`} />
      {art.stars.map((s, i) => (
        <path key={i} d={STAR} transform={`translate(${s.x} ${s.y}) scale(${s.r * 6})`} fill="#fff6c8" opacity="0.8" />
      ))}
      {art.pieces.map((p, i) => {
        const c = hsl(p.hue, 90, 62);
        const t = `translate(${p.x} ${p.y}) rotate(${p.rot})`;
        return p.k === 0 ? (
          <rect key={i} width={p.size} height={p.size / 2} x={-p.size / 2} y={-p.size / 4} fill={c} transform={t} />
        ) : p.k === 1 ? (
          <circle key={i} r={p.size / 2.2} fill={c} transform={t} />
        ) : p.k === 2 ? (
          <path key={i} d={STAR} transform={`${t} scale(${p.size / 1.4})`} fill={c} />
        ) : (
          <path key={i} d="M-4 0 Q-2 -4 0 0 T4 0" fill="none" stroke={c} strokeWidth="1.3" transform={t} />
        );
      })}
    </svg>
  );
}
