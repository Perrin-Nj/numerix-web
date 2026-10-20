// Pure and import-free (type-only) so node can load it for scripts/check-card-styles.mjs.
// Procedural art: every card id gets its own composition, from a different art language per family.
import type { CardSource } from './card-style';

export type Family = 'postcard' | 'badge' | 'present';
export type Glyph = { g: string; x: number; y: number; size: number; rot: number };
export type Piece = { x: number; y: number; rot: number; k: 0 | 1 | 2 | 3; hue: number; size: number };

export type Art = {
  family: Family;
  /** Silhouette. Families never share one: postcard, round or shield, present. */
  shape: 'postcard' | 'round' | 'shield' | 'present';
  signature: string;
  hue: number;
  hue2: number;
  sky: number; // postcard sky gradient variant
  horizon: number; // postcard ground variant
  sun: { x: number; y: number; moon: boolean };
  glyphs: Glyph[]; // scattered motifs
  hero: Glyph; // main motif or emblem
  stars: { x: number; y: number; r: number }[]; // constellation points
  pieces: Piece[]; // gift confetti
  rays: number; // badge sunrays
  metal: 'gold' | 'silver' | 'bronze';
  corner: number; // postcard stamp corner or gift bow variant
};

const WORLD_HUE: Record<string, number> = { nature: 130, espace: 250, cuisine: 25, sport: 200, construction: 40, medecine: 170, science: 280, echecs: 340 };

function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}
function rng(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n: number) => Math.floor(next() * n), range: (a2: number, b: number) => a2 + next() * (b - a2) };
}

export function familyOf(source: CardSource): Family {
  return source === 'gift' ? 'present' : source === 'challenge' ? 'badge' : 'postcard';
}

/** Source from the card id when the caller does not say (the app uses 'welcome' and 'ch-*' ids). */
export function sourceOf(id: string): CardSource {
  return id === 'welcome' ? 'gift' : id.startsWith('ch-') ? 'challenge' : 'chapter';
}

export function artFor(id: string, world: string, source: CardSource = 'chapter'): Art {
  const family = familyOf(source);
  const r = rng(seedOf(`${family}|${world}|${id}`));
  const baseHue = WORLD_HUE[world] ?? 130;
  const hue = family === 'postcard' ? (baseHue + r.int(61) - 30 + 360) % 360 : r.int(360);
  const hue2 = (hue + 40 + r.int(120)) % 360;
  const art: Omit<Art, 'signature'> = {
    family,
    shape: family === 'postcard' ? 'postcard' : family === 'present' ? 'present' : r.next() < 0.5 ? 'round' : 'shield',
    hue,
    hue2,
    sky: r.int(4),
    horizon: r.int(3),
    sun: { x: Math.round(r.range(15, 85)), y: Math.round(r.range(12, 34)), moon: r.next() < 0.3 },
    glyphs: [],
    hero: { g: '', x: 50, y: 56, size: 30, rot: 0 },
    stars: [],
    pieces: [],
    rays: 8 + r.int(9),
    metal: (['gold', 'silver', 'bronze'] as const)[r.int(3)],
    corner: r.int(4),
  };
  if (family === 'postcard') {
    for (let i = 0, m = 5 + r.int(4); i < m; i++) art.stars.push({ x: Math.round(r.range(6, 94)), y: Math.round(r.range(6, 40)), r: Math.round(r.range(8, 22)) / 10 });
  } else if (family === 'badge') {
    for (let i = 0, m = 4 + r.int(5); i < m; i++) art.stars.push({ x: Math.round(r.range(8, 92)), y: Math.round(r.range(8, 92)), r: Math.round(r.range(8, 20)) / 10 });
  } else {
    for (let i = 0, m = 16 + r.int(8); i < m; i++)
      art.pieces.push({ x: Math.round(r.range(4, 96)), y: Math.round(r.range(4, 96)), rot: r.int(360), k: r.int(4) as Piece['k'], hue: r.int(360), size: Math.round(r.range(30, 70)) / 10 });
    for (let i = 0, m = 2 + r.int(3); i < m; i++) art.stars.push({ x: Math.round(r.range(15, 85)), y: Math.round(r.range(15, 85)), r: Math.round(r.range(10, 26)) / 10 });
  }
  return { ...art, signature: `${family}-${art.shape}-${seedOf(JSON.stringify(art)).toString(36)}` };
}
