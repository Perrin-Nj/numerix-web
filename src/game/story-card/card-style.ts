// Pure and import-free (type-only) so node can load it for scripts/check-card-styles.mjs.
export type CardSource = 'chapter' | 'challenge' | 'gift';
export type Rarity = 'common' | 'rare' | 'epic';

export const PATTERNS = ['dots', 'waves', 'stars', 'bricks', 'leaves', 'diamonds', 'zigzag', 'rings'] as const;
export const EMBLEMS = ['star', 'flame', 'sparkles', 'book', 'trophy', 'heart', 'bookmark', 'shield', 'globe', 'moon', 'sun', 'map'] as const;
export type CardPattern = (typeof PATTERNS)[number];
export type CardEmblem = (typeof EMBLEMS)[number];

export type CardStyle = {
  hue: number; // 0..359 accent hue shift
  pattern: CardPattern;
  emblem: CardEmblem;
  foilAngle: number; // 0..359, direction of the foil gradient
  rarity: Rarity;
  frame: 'simple' | 'double' | 'wrapped'; // border design
  banner: 'tag' | 'strip' | 'gift'; // rarity marker design
  layout: 'standard' | 'notched'; // card silhouette
  signature: string;
};

const RARITY: Record<CardSource, Rarity> = { chapter: 'common', challenge: 'rare', gift: 'epic' };

/** FNV-1a 32 bit, then a mixing step so close ids land far apart. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

const DESIGN: Record<CardSource, Pick<CardStyle, 'frame' | 'banner' | 'layout'>> = {
  chapter: { frame: 'simple', banner: 'tag', layout: 'standard' },
  challenge: { frame: 'double', banner: 'strip', layout: 'standard' },
  gift: { frame: 'wrapped', banner: 'gift', layout: 'notched' },
};

export function cardStyleFor(id: string, world: string, source: CardSource = 'chapter'): CardStyle {
  const h = hash(`${world}:${id}`);
  const hue = h % 360;
  const pattern = PATTERNS[(h >>> 9) % PATTERNS.length];
  const emblem = EMBLEMS[(h >>> 13) % EMBLEMS.length];
  const foilAngle = (h >>> 17) % 360;
  const rarity = RARITY[source];
  return { hue, pattern, emblem, foilAngle, rarity, ...DESIGN[source], signature: `${hue}-${pattern}-${emblem}-${foilAngle}-${rarity}` };
}

/** Pattern tile as an SVG data URI in the card's accent colour. */
export function patternImage(pattern: CardPattern, hue: number): string {
  const c = `hsl(${hue} 70% 55%)`;
  const shapes: Record<CardPattern, string> = {
    dots: `<circle cx='6' cy='6' r='2.4' fill='${c}'/>`,
    waves: `<path d='M0 8 Q4 2 8 8 T16 8' fill='none' stroke='${c}' stroke-width='2'/>`,
    stars: `<path d='M8 2l1.8 4 4.2.4-3.2 2.8 1 4.2L8 11.2 4.2 13.4l1-4.2L2 6.4l4.2-.4z' fill='${c}'/>`,
    bricks: `<path d='M0 4h16M0 12h16M8 4v8M0 12v4M16 12v4M0 0v4M16 0v4' fill='none' stroke='${c}' stroke-width='1.6'/>`,
    leaves: `<path d='M3 13C3 6 8 3 13 3 13 10 8 13 3 13z' fill='${c}'/>`,
    diamonds: `<path d='M8 1l7 7-7 7-7-7z' fill='none' stroke='${c}' stroke-width='2'/>`,
    zigzag: `<path d='M0 12l4-8 4 8 4-8 4 8' fill='none' stroke='${c}' stroke-width='2'/>`,
    rings: `<circle cx='8' cy='8' r='5' fill='none' stroke='${c}' stroke-width='2'/>`,
  };
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'>${shapes[pattern]}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
