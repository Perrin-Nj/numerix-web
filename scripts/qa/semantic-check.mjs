// Semantic gate for 3D scenes: numbers drawn on plates/badges at the reveal must match the answer key,
// the reveal must differ from the question by the answer element, the question must not leak the answer.
// Input: matrix.json rows ({q:{<vp>:{align}}, r:{...}}) + the seed questions. Usage: node semantic-check.mjs <matrix.json> [seed.json] [out.json]
import fs from 'node:fs';

const num = (t) => {
  const m = String(t).replace(/\s|\u202f|\u00a0/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
};
const calc = (s) => (/^[\d+\-*/ ().]+$/.test(s) ? Function(`return (${s})`)() : null);
const isRes = (t) => /^[=~≈]/.test(String(t).trim());

/** answer key -> { vals: acceptable displayed numbers, rounded: true when an estimate is expected } or null when no number applies */
export function keyOf(q) {
  const a = q.answer;
  if (a.kind === 'numeric' && Array.isArray(a.value)) return { all: a.value };
  if (a.kind === 'numeric') return { vals: [a.value] };
  if (a.kind === 'range') return { range: [a.min, a.max], exact: a.exact_for_check };
  if (a.kind === 'choice' && a.calc_choice) {
    const v = calc(Object.values(a.calc_choice)[a.correct ? 0 : 0] ?? '');
    return v == null ? null : { vals: [v] };
  }
  return null;
}

export function checkRow(row, q) {
  const fails = [];
  const key = keyOf(q);
  for (const [vp, r] of Object.entries(row.r)) {
    const qq = row.q[vp];
    const ra = r.align;
    const qa = qq?.align;
    if (!ra || !qa) continue;
    const rt = (ra.texts ?? []).map(String);
    const qt = (qa.texts ?? []).map(String);
    const nums = rt.map(num).filter((x) => x != null);
    if (key?.vals) {
      if (!nums.some((n) => key.vals.includes(n))) fails.push(`${vp}: answer ${key.vals[0]} not drawn at reveal (${rt.slice(-4).join(',')})`);
      const bad = rt.filter((t) => isRes(t) && !key.vals.includes(num(t)));
      if (bad.length) fails.push(`${vp}: result plate ${bad.join(',')} differs from answer ${key.vals[0]}`);
      const leak = qt.filter((t) => isRes(t) && key.vals.includes(num(t)));
      if (leak.length) fails.push(`${vp}: question shows the answer ${leak[0]}`);
    }
    // badge on the picture: must show the answer too
    if (r.badge != null && key?.vals && !key.vals.includes(num(r.badge))) fails.push(`${vp}: badge ${r.badge} differs from answer ${key.vals[0]}`);
    if (r.badge != null && key?.range && !(num(r.badge) >= key.range[0] && num(r.badge) <= key.range[1])) fails.push(`${vp}: badge ${r.badge} outside ${key.range.join('-')}`);
    // per-group counts: n identical group labels "t" mean n groups of t objects (plus a few loose ones)
    {
      const cnt = {};
      qt.forEach((t) => { const v = num(t); if (v != null && /^\d+$/.test(t.trim())) cnt[v] = (cnt[v] ?? 0) + 1; });
      for (const [t, n] of Object.entries(cnt)) if (n >= 3 && ra.expect != null && ra.drawn >= 0 && Number(t) >= 2 && ra.drawn >= n * t * 0 && ra.expect > 0 && ra.expect >= n * t - 0 && ra.expect < n * t + 13 && ra.drawn !== ra.expect) fails.push(`${vp}: ${n} groups of ${t} but ${ra.drawn} drawn`);
    }
    if (key?.all && !key.all.every((v) => nums.includes(v))) fails.push(`${vp}: answer ${key.all.join(' r ')} not drawn at reveal (${rt.slice(-4).join(',')})`);
    if (key?.range) {
      const [lo, hi] = key.range;
      const ok = nums.some((n) => n >= lo && n <= hi && n !== key.exact);
      if (nums.includes(key.exact)) fails.push(`${vp}: exact value ${key.exact} drawn where an estimate is asked`);
      if (!ok) fails.push(`${vp}: no rounded estimate in ${lo}-${hi} drawn at reveal (${rt.slice(-4).join(',')})`);
    }
    if (JSON.stringify(rt) === JSON.stringify(qt) && ra.sig === qa.sig && ra.links === qa.links && ra.drawn === qa.drawn && (key?.vals || key?.range || key?.all || q.answer.kind === 'match' || q.answer.kind === 'order')) fails.push(`${vp}: reveal identical to question (no answer element)`);
  }
  return fails;
}

export function semantic(matrix, questions) {
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  const out = {};
  for (const [id, row] of Object.entries(matrix)) {
    if (!byId[id] || !row.r) continue;
    const f = checkRow(row, byId[id]);
    out[id] = f.length ? { pass: false, fails: f.slice(0, 4), n: f.length } : { pass: true };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('semantic-check.mjs')) {
  const [mf, sf = 'C:/nx/ct-espace/seed/questions/espace.json', of] = process.argv.slice(2);
  const res = semantic(JSON.parse(fs.readFileSync(mf, 'utf8')), JSON.parse(fs.readFileSync(sf, 'utf8')).questions);
  if (of) fs.writeFileSync(of, JSON.stringify(res, null, 1));
  const bad = Object.entries(res).filter(([, v]) => !v.pass);
  console.log(`semantic: ${Object.keys(res).length - bad.length} pass / ${bad.length} fail`);
  for (const [id, v] of bad) console.log(id.replace('espace.', ''), v.fails[0]);
  process.exit(bad.length ? 1 : 0);
}
