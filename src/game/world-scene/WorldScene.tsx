import { useId, type CSSProperties } from 'react';
import { cn } from '@/shared/cn';
import type { WorldId } from '@/data/api/types';
import { buildArt, C } from './scenes';

export type WorldSceneVariant = 'tile' | 'banner' | 'hero';
export type WorldSceneMood = 'idle' | 'success' | 'detour' | 'surprise';

export type WorldSceneProps = {
  world: WorldId;
  variant: WorldSceneVariant;
  mood?: WorldSceneMood;
  className?: string;
};

const HERO: Record<WorldId, string> = {
  nature: '🐿️',
  espace: '🧑‍🚀',
  cuisine: '🧑‍🍳',
  sport: '🏃',
  construction: '👷',
  medecine: '🧑‍⚕️',
  science: '🧑‍🔬',
  echecs: '♞',
  ocean: '🐙',
  dinosaures: '🦖',
  animaux: '🦊',
  musique: '🎻',
  transport: '🚂',
  pirates: '🏴‍☠️',
  marche: '🧺',
  meteo: '🌦️',
  robots: '🤖',
  arts: '🎨',
  hiver: '⛷️',
  jeux: '🧩',
};

// Tile crops to the middle so the hero and one prop read at 80px.
const VIEW: Record<WorldSceneVariant, string> = {
  tile: '90 44 140 136',
  banner: '0 0 320 180',
  hero: '0 0 320 180',
};

const SPARKS: [number, number][] = [[118, 92], [206, 88], [128, 130], [196, 136], [160, 80], [226, 114]];

function Mood({ mood, world }: { mood: WorldSceneMood; world: WorldId }) {
  if (mood === 'success') {
    return (
      <g>
        <circle cx={160} cy={116} r={74} fill="url(#nx-glow)" className="nx-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        {SPARKS.map(([x, y], i) => (
          <path
            key={i}
            transform={`translate(${x} ${y})`}
            d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z"
            fill={C.sun}
            className="nx-twinkle"
            style={{ '--i': i } as CSSProperties}
          />
        ))}
      </g>
    );
  }
  if (mood === 'detour') {
    return (
      <g className="nx-rise">
        <path d="M170 156 Q226 150 238 126 T300 104" stroke={C.paper} strokeWidth={7} strokeLinecap="round" strokeDasharray="2 11" fill="none" />
        <g transform="translate(262 100)">
          <rect x={-1.5} y={0} width={3} height={22} fill={C.ink} />
          <path d="M-14 -8 h22 l7 6 l-7 6 h-22z" fill={C.sun} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
        </g>
      </g>
    );
  }
  if (mood === 'surprise') {
    const glyph = world === 'nature' ? '🍃' : '✨';
    return (
      <g transform="translate(160 112)">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`rotate(${i * 72})`}>
            <g className="nx-swirl">
              <g transform="translate(46 0)">
                <text fontSize={16} textAnchor="middle" dominantBaseline="central">{glyph}</text>
              </g>
            </g>
          </g>
        ))}
      </g>
    );
  }
  return null;
}

/**
 * Original layered illustration drawn in code. Decorative: the parent names it.
 * Fills its parent (size-full); the parent sets the aspect ratio.
 */
export function WorldScene({ world, variant, mood = 'idle', className }: WorldSceneProps) {
  const uid = useId().replace(/:/g, '');
  const art = buildArt(world, variant !== 'tile');
  const style = {
    '--w': `var(--world-${world})`,
    '--w-ll': 'color-mix(in srgb, var(--w) 28%, white)',
    '--w-l': 'color-mix(in srgb, var(--w) 58%, white)',
    '--w-d': 'color-mix(in srgb, var(--w) 72%, black)',
    '--w-dd': 'color-mix(in srgb, var(--w) 45%, black)',
    '--paper': 'white',
    '--ink': 'color-mix(in srgb, var(--w) 25%, black)',
    '--sun': 'var(--beat-detour)',
  } as CSSProperties;
  const sky = `nx-sky-${uid}`;
  return (
    <svg
      viewBox={VIEW[variant]}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      data-world={world}
      data-mood={mood}
      className={cn('block size-full', className)}
      style={style}
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.sky[0]} />
          <stop offset="1" stopColor={art.sky[1]} />
        </linearGradient>
        <radialGradient id="nx-glow">
          <stop offset="0" stopColor="var(--beat-success)" stopOpacity={0.75} />
          <stop offset="1" stopColor="var(--beat-success)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-20} y={-20} width={360} height={220} fill={`url(#${sky})`} />
      {art.backdrop}
      <g className="nx-drift" style={{ '--dx': '6px', '--drift-s': '46s' } as CSSProperties}>
        {art.far}
      </g>
      <g className="nx-drift" style={{ '--dx': '12px', '--drift-s': '30s' } as CSSProperties}>
        {art.mid}
      </g>
      {art.near}
      {art.front}
      <ellipse cx={160} cy={146} rx={26} ry={5} fill={C.ink} opacity={0.35} />
      <text
        x={160}
        y={146}
        fontSize={54}
        textAnchor="middle"
        className={mood === 'success' ? 'nx-bounce' : 'nx-float'}
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
      >
        {HERO[world]}
      </text>
      <Mood mood={mood} world={world} />
    </svg>
  );
}
