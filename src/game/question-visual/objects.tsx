import type { CSSProperties, ReactNode } from 'react';
import { DRAWN_NAMES } from './drawnNames';
import { objectSrc } from './objectSrc';

const tile = (fill: string, edge: string): ReactNode => (
  <>
    <rect x="6" y="6" width="52" height="52" rx="9" fill={fill} stroke={edge} strokeWidth="4" />
    <rect x="13" y="13" width="38" height="38" rx="5" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" />
  </>
);

/** Inline drawings for pictures with no file in public/objects. viewBox 0 0 64 64. */
const DRAWN: Record<(typeof DRAWN_NAMES)[number], ReactNode> = {
  box: (
    <>
      <path d="M8 22 L32 10 L56 22 V48 L32 58 L8 48 Z" fill="#d9a066" stroke="#8a5a2b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 22 L32 34 L56 22 M32 34 V58" fill="none" stroke="#8a5a2b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 16 L44 28 V35 L22 23 Z" fill="#f3e3c3" stroke="#8a5a2b" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  bag: (
    <>
      <path d="M20 14 Q32 22 44 14 L50 24 Q56 34 52 50 Q50 58 40 58 H24 Q14 58 12 50 Q8 34 14 24 Z" fill="#c98f5a" stroke="#7a4b22" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 14 L16 6 H48 L44 14" fill="#e3b98a" stroke="#7a4b22" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 34 H44 M22 42 H42" stroke="#7a4b22" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  sun: (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="32" y1="5" x2="32" y2="14" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="14" fill="#fcd34d" stroke="#d97706" strokeWidth="3" />
    </>
  ),
  kibble: (
    <>
      <circle cx="32" cy="32" r="22" fill="#b5703a" stroke="#6e3f1a" strokeWidth="4" />
      <circle cx="24" cy="26" r="4" fill="#6e3f1a" opacity=".5" />
      <circle cx="38" cy="38" r="4" fill="#6e3f1a" opacity=".5" />
      <circle cx="39" cy="24" r="3" fill="#6e3f1a" opacity=".5" />
    </>
  ),
  treat: (
    <>
      <path d="M14 22 a8 8 0 1 1 8 -8 H42 a8 8 0 1 1 8 8 V42 a8 8 0 1 1 -8 8 H22 a8 8 0 1 1 -8 -8 Z" fill="#f2cf8e" stroke="#a9742f" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="26" cy="32" r="2.5" fill="#a9742f" />
      <circle cx="38" cy="32" r="2.5" fill="#a9742f" />
    </>
  ),
  glove: (
    <>
      <path d="M16 34 V16 a4 4 0 0 1 8 0 V28 V10 a4 4 0 0 1 8 0 V28 V12 a4 4 0 0 1 8 0 V30 V18 a4 4 0 0 1 8 0 V40 Q48 58 34 58 Q22 58 16 46 Z" fill="#7cc3ee" stroke="#2f7fb4" strokeWidth="3" strokeLinejoin="round" />
      <rect x="20" y="54" width="26" height="8" rx="3" fill="#b9dff5" stroke="#2f7fb4" strokeWidth="3" />
    </>
  ),
  tile: tile('#60a5fa', '#1d4ed8'),
  'tile-blue': tile('#60a5fa', '#1d4ed8'),
  'tile-yellow': tile('#fcd34d', '#b45309'),
};

export const isDrawn = (name: unknown): name is keyof typeof DRAWN => typeof name === 'string' && name in DRAWN;

/** An object picture: the webp when it exists, else the inline drawing. Safe in HTML. */
export function ObjectIcon({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  if (isDrawn(name))
    return (
      <svg viewBox="0 0 64 64" aria-hidden className={className} style={style}>
        {DRAWN[name]}
      </svg>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectSrc(name) ?? undefined} alt="" draggable={false} className={className} style={style} />;
}

/** Same picture inside an <svg> (number line pins). */
export function ObjectIconSvg({ name, x, y, size, className, style }: { name: string; x: number; y: number; size: number; className?: string; style?: CSSProperties }) {
  if (isDrawn(name))
    return (
      <svg x={x} y={y} width={size} height={size} viewBox="0 0 64 64" className={className} style={style}>
        {DRAWN[name]}
      </svg>
    );
  return <image href={objectSrc(name) ?? undefined} x={x} y={y} width={size} height={size} className={className} style={style} />;
}
