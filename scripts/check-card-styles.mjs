// 30 different card ids must give 30 distinct style signatures, deterministically.
import { cardStyleFor } from '../src/game/story-card/card-style.ts';
import { artFor } from '../src/game/story-card/art.ts';

const worlds = ['nature', 'espace', 'cuisine', 'sport', 'construction', 'medecine', 'science', 'echecs'];
const sigs = new Set();
for (let i = 0; i < 30; i++) {
  const id = `5f1c1b0e-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
  const s = cardStyleFor(id, worlds[i % worlds.length], 'chapter');
  if (cardStyleFor(id, worlds[i % worlds.length], 'chapter').signature !== s.signature) throw new Error('not deterministic');
  sigs.add(s.signature);
}
if (sigs.size !== 30) {
  console.error(`Card style check failed: ${sigs.size}/30 distinct`);
  process.exit(1);
}
if (new Set(['chapter', 'challenge', 'gift'].map((x) => cardStyleFor('a', 'nature', x).rarity)).size !== 3) {
  console.error('Card style check failed: rarity by source');
  process.exit(1);
}
const d = Object.fromEntries(['chapter', 'challenge', 'gift'].map((x) => [x, cardStyleFor('a', 'nature', x)]));
for (const f of ['frame', 'banner', 'layout']) {
  if (d.gift[f] === d.chapter[f] || d.gift[f] === d.challenge[f]) { console.error(`Card style check failed: gift ${f} not distinct`); process.exit(1); }
}
for (const f of ['frame', 'banner']) {
  if (d.chapter[f] === d.challenge[f]) { console.error(`Card style check failed: chapter and challenge ${f} equal`); process.exit(1); }
}
console.log('Card style check passed (30/30 distinct)');

// Procedural art: 100 ids across 8 worlds and 3 sources give >= 95 distinct signatures; families never share a shape.
const sources = ['chapter', 'challenge', 'gift'];
const arts = Array.from({ length: 100 }, (_, i) => artFor(`card-${i}-${i * 7919}`, worlds[i % 8], sources[i % 3]));
const distinct = new Set(arts.map((a) => a.signature)).size;
const shapes = {};
for (const a of arts) (shapes[a.family] ??= new Set()).add(a.shape);
const all = Object.values(shapes).flatMap((x) => [...x]);
if (distinct < 95) { console.error(`Art check failed: ${distinct}/100 distinct`); process.exit(1); }
if (new Set(all).size !== all.length) { console.error('Art check failed: families share a shape'); process.exit(1); }
if (artFor('x', 'nature', 'chapter').signature !== artFor('x', 'nature', 'chapter').signature) { console.error('Art check failed: not deterministic'); process.exit(1); }
console.log(`Art check passed (${distinct}/100 distinct)`);
