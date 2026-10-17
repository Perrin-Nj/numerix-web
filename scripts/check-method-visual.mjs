// Node 22 (type stripping): the place-value plans behind the how-to pictures must add up. Run: node scripts/check-method-visual.mjs
import { addPlan, subPlan } from '../src/game/method-visual/plans.ts';

let bad = 0;
const fail = (m) => { console.log(`FAIL ${m}`); bad++; };
const value = (blocks) => blocks.reduce((n, c, i) => n + c * 10 ** i, 0);

for (let a = 1; a < 1200; a += 7) {
  for (let b = 1; b < 300; b += 11) {
    const p = addPlan(a, b);
    if (value(p.start) !== a + b) fail(`add ${a}+${b}: start sums to ${value(p.start)}`);
    if (value(p.end) !== a + b) fail(`add ${a}+${b}: end sums to ${value(p.end)}`);
    if (p.end.some((n) => n < 0 || n > 9)) fail(`add ${a}+${b}: a place ends outside 0..9 (${p.end})`);
    if (a >= b) {
      const s = subPlan(a, b);
      if (value(s.regrouped) !== a) fail(`sub ${a}-${b}: regroup changed the value (${s.regrouped})`);
      const left = s.regrouped.map((n, i) => n - s.leaving[i]);
      if (value(left) !== a - b) fail(`sub ${a}-${b}: ${value(left)} left, wanted ${a - b}`);
      if (left.some((n) => n < 0 || n > 9)) fail(`sub ${a}-${b}: a place ends outside 0..9 (${left})`);
    }
  }
}
console.log(bad ? `${bad} FAILED` : 'ok   place-value plans add up for 1..1200 + 1..300');
process.exit(bad ? 1 : 0);
