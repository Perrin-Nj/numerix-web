// Deterministic per-question scene gate (node, no browser). Run through scripts/qa/scene-gate.mjs, which sets SCENE_GATE_OUT.
// Reuses routeQuestion, checkScene (bind, counts, answer leak, alt numbers, story-objects, forbidden props), and objects.ts.
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, vi } from 'vitest';
import { photoFallback } from './stage-check';

vi.hoisted(() => { process.env.NEXT_PUBLIC_FEATURE_SCENES = 'true'; });
import { hasProvenance, numbersIn, resolveScene } from '@/game/scene-stage/bind';
import { describeScene } from '@/game/scene-stage/describe';
import { glyphOf, namedObjects, type World } from '@/game/scene-stage/objects';
import { loadArchetype } from '@/game/scene-stage/registry';
import { GLYPHS } from '@/game/scene-stage/kit/glyphs';
import { routeQuestion, type RawQuestion } from '@/game/scene-stage/route';
import { checkScene } from '@/game/scene-stage/validate';
import { espaceClockDocked } from '@/game/scene-stage/fixtures/espace-clock';
import { PILOT_SCENES } from '@/game/scene-stage/fixtures/pilot';

const OUT = process.env.SCENE_GATE_OUT;
const WORLDS: World[] = ['espace'];
const seed = (w: World) => (process.env.SEED_ROOT ? path.join(process.env.SEED_ROOT, `${w}.json`) : `C:/nx/rel2-api/seed/questions/${w}.json`);
const NODE_MAX = 250;
const ALIAS: Record<string, string> = { 'chess-pawn-b': 'pawn', 'chess-rook': 'rook', 'chess-knight': 'knight', 'chess-bishop': 'bishop', 'chess-queen': 'queen', 'chess-king': 'king', 'water-drop': 'drop', tile: 'mat', 'tile-yellow': 'mat', 'tile-blue': 'mat', 'person-man': 'person', 'person-woman': 'person' };
const isGlyph = (g: string) => (GLYPHS as readonly string[]).includes(g);

function icons(o: unknown, out = new Set<string>()): Set<string> {
  if (typeof o === 'string') {
    const m = /^img:(.+)$/.exec(o);
    if (m) out.add(m[1]!);
  } else if (Array.isArray(o)) o.forEach((x) => icons(x, out));
  else if (o && typeof o === 'object') for (const [k, x] of Object.entries(o)) k === 'icon' && typeof x === 'string' ? out.add(x) : icons(x, out);
  return out;
}

describe.skipIf(!OUT)('scene gate', () => {
  it('gates every seed question', async () => {
    const res: Record<string, { pass: boolean; reasons: string[] }> = {};
    const meta: Record<string, { archetype?: string; requires?: string[]; bound?: Record<string, number> }> = {};
    for (const w of WORLDS) {
      const qs = (JSON.parse(fs.readFileSync(seed(w), 'utf8')) as { questions: RawQuestion[] }).questions;
      for (const q of qs) {
        const why: string[] = [];
        const add = (r: string) => why.push(r);
        const pilot = [...PILOT_SCENES, espaceClockDocked].find((p) => p.id === q.id);
        const r = pilot ?? routeQuestion(w, q);
        if ('skip' in r) {
          add(`refusal: ${r.skip}`);
          res[q.id] = { pass: false, reasons: why };
          continue;
        }
        const photo = photoFallback(q, r.spec);
        if (photo) add(photo);
        for (const p of checkScene(r)) add(`${p.rule}: ${p.detail}`);
        const { spec } = r;
        meta[q.id] = { archetype: spec.archetype, requires: spec.requires };
        const named = [...new Set([...namedObjects(w, `${r.fr.story} ${r.fr.prompt}`), ...namedObjects(w, `${r.en.story} ${r.en.prompt}`)])];
        try {
          const fq = resolveScene(spec, r.fr);
          const fr = resolveScene(spec, r.fr, { reveal: true });
          const er = resolveScene(spec, r.en, { reveal: true });
          meta[q.id]!.bound = fr.values;
          // bound numbers: same in both languages (each is already proven readable in the question by resolveScene)
          for (const k of Object.keys(fr.values)) if (fr.values[k] !== er.values[k]) add(`bound-numbers: ${k} is ${fr.values[k]} in fr and ${er.values[k]} in en`);
          // the opening must not hold the answer
          const ans = typeof r.fr.correctAnswer === 'number' ? r.fr.correctAnswer : null;
          const given = [...numbersIn(`${r.fr.story} ${r.fr.prompt}`), ...numbersIn(r.fr.math_text), ...numbersIn(r.fr.calc)];
          if (ans !== null && !given.includes(ans) && !hasProvenance(ans, r.fr)) {
            if (new RegExp(`(^|\\D)${ans}(\\D|$)`).test(describeScene(fq, 'fr'))) add(`answer-in-opening: alt says ${ans}`);
            for (const [k, v] of Object.entries(fq.values)) if (v === ans) add(`answer-in-opening: ${k} = ${ans} before the reveal`);
            for (const [id, p] of Object.entries(fq.props)) if (p.count === ans && !spec.props.find((x) => x.id === id)?.at) add(`answer-in-opening: ${id} draws ${ans} before the reveal`);
          }
          // alt text states every counted quantity
          const label = describeScene(fr, 'fr');
          const labelEn = describeScene(er, 'en');
          if (!spec.alt.fr?.trim() || !spec.alt.en?.trim()) add('alt: missing alt text');
          for (const p of spec.props)
            if (typeof p.count === 'string') {
              const v = fr.values[p.count.slice(1)];
              if (v && v > 0 && !new RegExp(`(^|\\D)${v}(\\D|$)`).test(label)) add(`alt-count: fr label does not state ${v} (${p.id})`);
              if (v && v > 0 && !new RegExp(`(^|\\D)${v}(\\D|$)`).test(labelEn)) add(`alt-count: en label does not state ${v} (${p.id})`);
            }
          // node budget per phase, from a server render of the archetype
          const mod = await loadArchetype(spec.archetype);
          for (const [phase, sc] of [['question', fq], ['ok', fr], ['ko', fr]] as const) {
            try {
              const n = (renderToStaticMarkup(createElement(mod.default, { scene: sc, phase, locale: 'fr' })).match(/<[a-zA-Z]/g) ?? []).length;
              if (n > NODE_MAX) add(`nodes: ${n} nodes in ${phase} (max ${NODE_MAX})`);
            } catch (e) {
              add(`render-error: ${phase}: ${String((e as Error).message).slice(0, 80)}`);
            }
          }
        } catch (e) {
          add(`bind: ${String((e as Error).message).slice(0, 120)}`);
        }
        // stand-in glyph: what is drawn for counted things must be named by the question, shown by its visual, or the neutral block
        const g = /-(?:grid|chart)-(\w+)$/.exec(spec.setting)?.[1] ?? spec.props.map((p) => p.id.replace(/-\d+$/, '')).find(isGlyph);
        if (g) {
          const drawable = named.map(glyphOf).filter((x) => isGlyph(x) && x !== 'board');
          const okSet = new Set([...named.map(glyphOf), ...[...icons(q.visual?.data)].map((i) => ALIAS[i] ?? i), 'cell']);
          if (!okSet.has(g) && !(g === 'mat' && !drawable.length)) add(`stand-in-glyph: draws "${g}" but the question names ${named.join(',') || 'nothing drawable'}`);
          if (g === 'cell' && drawable.length) add(`stand-in-glyph: neutral block used while the question names ${drawable.join(',')}`);
        }
        res[q.id] = { pass: why.length === 0, reasons: why };
      }
    }
    fs.mkdirSync(path.dirname(OUT!), { recursive: true });
    fs.writeFileSync(OUT!, JSON.stringify(res, null, 1));
    fs.writeFileSync(path.join(path.dirname(OUT!), 'scene-meta.json'), JSON.stringify(meta, null, 1));
  }, 600000);
});
