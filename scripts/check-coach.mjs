import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextHint } from '../src/lib/coach/nextHint.ts';

const pool = ['a', 'b', 'c'];
const shown = [];
for (let i = 0; i < 3; i++) {
  const h = nextHint(pool, shown);
  assert.ok(!shown.includes(h), 'no repeat before pool exhausted');
  shown.push(h);
}
assert.deepEqual([...shown].sort(), pool, 'all three shown');
assert.notEqual(nextHint(pool, shown), shown[2], 'after exhaustion, not the same as last');
assert.equal(nextHint([], []), null, 'empty pool');
assert.equal(nextHint(['x'], ['x']), 'x', 'single hint repeats');

// every skill has 3 hints per locale, plus generic
const skills = ['ARI-OPE-A02a', 'ARI-OPE-A03a', 'ARI-OPE-A05', 'ARI-OPE-A06a', 'ARI-SOP-A03a', 'ARI-OPE-A07a', 'ARI-SEN-A01c', 'generic'];
for (const loc of ['fr-CA', 'en-CA']) {
  const { coach } = JSON.parse(readFileSync(new URL(`../src/lib/coach/messages.${loc}.json`, import.meta.url), 'utf8'));
  for (const s of skills) assert.ok(Array.isArray(coach[s]) && coach[s].length === 3, `${loc} ${s} needs 3 hints`);
}
console.log('Coach check passed');
