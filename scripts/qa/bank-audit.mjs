// Question bank + asset audit straight from numerix-api/seed. Mechanical checks over ALL questions, plus a seeded random
// sample of 60 printed for manual re-solving. Usage: node scripts/qa/bank-audit.mjs [--sample] > out/bank.txt
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SEED = resolve(import.meta.dirname, '../../../numerix-api/seed');
const qs = [];
for (const f of readdirSync(`${SEED}/questions`).filter((f) => f.endsWith('.json') && !/^(_examples|picks|rejected|sprites|credits)/.test(f))) {
  const j = JSON.parse(readFileSync(`${SEED}/questions/${f}`, 'utf8'));
  for (const q of j.questions ?? []) qs.push({ ...q, _world: j.world });
}
const defects = [];
const bad = (q, sev, msg) => defects.push({ id: q.id, sev, msg });
const kinds = {}, worlds = {};
const safe = (e) => (/^[\d+\-*/().\s^%x×÷,]+$/.test(e) ? Function(`"use strict";return (${e.replace(/×|x/g, '*').replace(/÷/g, '/').replace(/\^/g, '**')})`)() : null);
const ids = new Set();
for (const q of qs) {
  kinds[q.answer?.kind ?? q.type] = (kinds[q.answer?.kind ?? q.type] ?? 0) + 1;
  worlds[q._world] = (worlds[q._world] ?? 0) + 1;
  if (ids.has(q.id)) bad(q, 'P0', 'duplicate id'); ids.add(q.id);
  if (q.status !== 'published') continue;
  for (const f of ['story', 'prompt', 'hint', 'explain']) for (const l of ['fr', 'en']) if (!q[f]?.[l]?.trim()) bad(q, 'P1', `missing ${f}.${l}`);
  const a = q.answer ?? {};
  if (a.kind === 'numeric' && a.calc) {
    let v = null; try { v = safe(a.calc); } catch { /* not plain arithmetic */ }
    if (v !== null && Math.abs(v - a.value) > 1e-9) bad(q, 'P0', `answer ${a.value} != calc ${a.calc}=${v}`);
  }
  if (q.math_text && a.kind === 'numeric') {
    const m = /^([\d.,]+) ([+\-−×÷]) ([\d.,]+) = \?$/.exec(q.math_text.trim());
    if (m) { const [x, y] = [Number(m[1].replace(',', '.')), Number(m[3].replace(',', '.'))]; const r = { '+': x + y, '-': x - y, '−': x - y, '×': x * y, '÷': x / y }[m[2]]; if (Math.abs(r - a.value) > 1e-9) bad(q, 'P0', `math_text ${q.math_text} gives ${r}, answer ${a.value}`); }
  }
  const ce = q.common_errors ?? [];
  if (a.kind === 'numeric') { const vs = ce.map((c) => c.value); if (vs.includes(a.value)) bad(q, 'P0', 'distractor equals the answer'); if (new Set(vs).size !== vs.length) bad(q, 'P1', 'duplicate distractors'); if (ce.length < 2) bad(q, 'P2', `only ${ce.length} common errors`); }
  const txt = JSON.stringify([q.story, q.prompt]);
  if (a.kind === 'numeric' && new RegExp(`\\b${a.value}\\b`).test(q.story?.fr ?? '')) bad(q, 'P1', 'story leaks the answer number');
  if (/\s[?!:;]/.test(q.prompt?.fr ?? '') === false && /[?!:;]/.test(q.prompt?.fr ?? '') && !/ [?!:;]/.test(q.prompt?.fr ?? '') && /[a-zé][?!]/.test(q.prompt?.fr ?? '')) bad(q, 'P2', 'fr punctuation spacing (no space before ? or !)');
  if (/\p{Extended_Pictographic}/u.test(txt)) bad(q, 'P1', 'emoji in question text');
  if (/—|–/.test(txt)) bad(q, 'P2', 'em/en dash in copy');
  if (/\b(as-tu|avez-vous)\b/i.test('') ) bad(q, 'P2', '');
  if (!(q.grade >= 1 && q.grade <= 6)) bad(q, 'P1', `grade ${q.grade}`);
  if (!q.media?.length) bad(q, 'P2', 'no media');
}
// assets
const credits = JSON.parse(readFileSync(`${SEED}/assets/credits.json`, 'utf8'));
const photos = credits.photos ?? [];
const files = new Set(existsSync(`${SEED}/assets/files`) ? readdirSync(`${SEED}/assets/files`) : []);
const byAsset = new Map(photos.map((p) => [p.id, p]));
let used = new Set();
for (const q of qs) for (const m of q.media ?? []) used.add(m.asset);
const assetDefects = [];
for (const id of used) {
  const p = byAsset.get(id);
  if (!p) { assetDefects.push([id, 'P1', 'asset used by a question but absent from credits.json']); continue; }
  for (const k of ['licence', 'licence_url', 'attribution_text', 'creator', 'source_url']) if (!p[k]) assetDefects.push([id, 'P1', `credits missing ${k}`]);
  if (p.thumb && files.size && !files.has(p.thumb)) assetDefects.push([id, 'P1', `thumb file missing ${p.thumb}`]);
  if (!(p.alt?.fr || p.alt_fr) || !(p.alt?.en || p.alt_en)) assetDefects.push([id, 'P2', `alt fr/en missing (keys: ${Object.keys(p).join(',')})`]);
}
// seeded sample
let s = 20261019; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pub = qs.filter((q) => q.status === 'published');
const sample = [...pub].sort(() => rnd() - 0.5).slice(0, 60);
console.log(`questions=${qs.length} published=${pub.length} kinds=${JSON.stringify(kinds)}\nworlds=${JSON.stringify(worlds)}`);
console.log(`mechanical defects: ${defects.length} (P0 ${defects.filter((d) => d.sev === 'P0').length}, P1 ${defects.filter((d) => d.sev === 'P1').length}, P2 ${defects.filter((d) => d.sev === 'P2').length})`);
const grp = {}; for (const d of defects) (grp[`${d.sev} ${d.msg.replace(/[\d.]+/g, 'N').slice(0, 50)}`] ??= []).push(d.id);
for (const [k, v] of Object.entries(grp)) console.log(`  ${k}: ${v.length} e.g. ${v.slice(0, 3).join(', ')}`);
const ag = {}; for (const d of assetDefects) (ag[`${d[1]} ${d[2].replace(/a_[0-9a-f]+/g, 'ID').slice(0, 60)}`] ??= []).push(d[0]);
console.log(`assets used=${used.size} credited=${photos.length} files=${files.size}; asset defects ${assetDefects.length}`);
for (const [k, v] of Object.entries(ag)) console.log(`  ${k}: ${v.length} e.g. ${v.slice(0, 2).join(', ')}`);
if (process.argv.includes('--sample')) for (const q of sample) console.log(`\n[${q.id}] g${q.grade} d${q.difficulty} ${q.answer?.kind}\nS: ${q.story?.fr}\nP: ${q.prompt?.fr}\nM: ${q.math_text ?? ''}\nA: ${JSON.stringify(q.answer)}\nE: ${(q.common_errors ?? []).map((c) => JSON.stringify(c.value ?? c)).join(' ')}\nH: ${q.hint?.fr}\nX: ${q.explain?.fr}`);
if (defects.some((d) => d.sev !== 'P2') || assetDefects.some((d) => d[1] !== 'P2')) process.exitCode = 1;
