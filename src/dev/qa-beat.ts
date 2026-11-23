import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { MediaRef, Question } from '@/data/api/types';
import { entryOf } from '@/game/scene-stage/delivery';
import { routeQuestion, type RawQuestion } from '@/game/scene-stage/route';
import { PILOT_SCENES } from '@/game/scene-stage/fixtures/pilot';
import { espaceClockDocked } from '@/game/scene-stage/fixtures/espace-clock';
import type { SceneSpec } from '@/game/scene-stage';

/**
 * Render-audit helper (dev only). Rebuilds the Beat the API would send for a bank question, from the seed JSON
 * and the asset database, by porting pv-api internal/app/content_play.go curatedBeatView and
 * internal/assetstore Resolve/scoreOf/MediaFor. See specs/001-three-worlds-premium/review/render-audit-harness.md.
 * Env: QA_QUESTION_FILES (comma list of seed/questions/<world>.json), QA_ASSET_DB (SQLite of a seeded API), QA_ASSET_BASE.
 */
type LText = { fr?: string; en?: string };
type Crit = { world?: string; topic?: string; object?: string; mood?: string; kind?: string; setting?: string };
type Seed = {
  id: string; skill: string; type: string; grade: number; style?: string;
  story: LText; prompt: LText; math_text?: string; hint?: LText; explain?: LText;
  visual?: { kind: string; data?: Record<string, unknown> };
  choices?: { id: string; text: LText }[];
  items?: { id: string; text: LText }[] | { left: { id: string; text: LText }[]; right: { id: string; text: LText }[] };
  media?: { role: string; asset?: string; criteria?: Crit }[];
  answer: { kind: string; value?: unknown; correct?: string; sequence?: string[]; pairs?: unknown; min?: number; max?: number; exact_for_check?: number };
};
type Asset = { id: string; kind: string; world: string; band: string; mood: string; tags: Record<string, string[]>; alt: string; color: string; lqip: string; w: number; h: number; widths: number[] };

export type QaBeat = {
  id: string; world: string; grade: number; skill: string;
  question: Question; correctAnswer: unknown; explain: string | null;
  /** Reveal part of the scene spec, from the same spec file the API serves (QA_SCENE_SPECS). */
  sceneReveal?: Record<string, unknown> | null;
  debug: { criteria: Crit[]; resolved: { role: string; asset: string | null; pool: string[]; via: string }[] };
};

const FILES = (process.env.QA_QUESTION_FILES ?? 'C:/nx/ct-echecs/seed/questions/echecs.json,C:/nx/ct-medecine/seed/questions/medecine.json,C:/nx/ct-espace/seed/questions/espace.json').split(',');
const BASE = process.env.QA_ASSET_BASE ?? '/assets';
let cache: Map<string, Seed & { world: string }> | null = null;
let db: DatabaseSync | null = null;

export function allSeeds() {
  if (!cache) {
    cache = new Map();
    for (const f of FILES) {
      const j = JSON.parse(readFileSync(f, 'utf8')) as { world: string; questions: Seed[] };
      for (const q of j.questions) cache.set(q.id, { ...q, world: j.world });
    }
  }
  return cache;
}

const shuffled = <T>(list: T[], seed: string, key: (t: T) => string) => {
  const w = (t: T) => createHash('sha256').update(`${seed}|${key(t)}`).digest().readBigUInt64BE(0);
  return [...list].sort((a, b) => (w(a) < w(b) ? -1 : w(a) > w(b) ? 1 : 0));
};

/** content.ChoiceValue: a numeric text becomes a number, anything else stays text. */
function choiceValue(text: string): number | string {
  let s = text.trim();
  const t = s.replace(/[\u00a0\u202f ]/g, '');
  const noThousands = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t;
  s = noThousands.replace(/,/g, '.');
  return s !== '' && !/[\/eE+]/.test(s) && /^-?\d*\.?\d+$/.test(s) ? Number(s) : text.trim();
}

function dbh() {
  return (db ??= new DatabaseSync(process.env.QA_ASSET_DB ?? 'C:/nx/audit/qa.db', { readOnly: true }));
}

function loadAsset(id: string): Asset | null {
  const r = dbh().prepare(`SELECT id, kind, COALESCE(world_id,'') world, grade_band band, COALESCE(mood,'') mood, alt_fr alt, dominant_color color, lqip, width, height
    FROM assets WHERE id = ? AND review_status = 'approved' AND people_free = 1 AND brand_free = 1`).get(id) as Record<string, string | number> | undefined;
  return r ? hydrate([r])[0] : null;
}

function hydrate(rows: Record<string, string | number>[]): Asset[] {
  const out: Asset[] = rows.map((r) => ({ id: String(r.id), kind: String(r.kind), world: String(r.world), band: String(r.band), mood: String(r.mood), alt: String(r.alt), color: String(r.color), lqip: String(r.lqip), w: Number(r.width), h: Number(r.height), tags: {}, widths: [] }));
  const by = new Map(out.map((a) => [a.id, a]));
  for (const t of dbh().prepare('SELECT asset_id, facet, value FROM asset_tags ORDER BY facet, value').all() as { asset_id: string; facet: string; value: string }[]) { const a = by.get(t.asset_id); if (a) (a.tags[t.facet] ??= []).push(t.value); }
  for (const v of dbh().prepare(`SELECT asset_id, w FROM asset_variants WHERE format = 'webp' ORDER BY w`).all() as { asset_id: string; w: number }[]) by.get(v.asset_id)?.widths.push(v.w);
  return out;
}

const band = (g: number) => (g <= 2 ? '1-2' : g <= 4 ? '3-4' : '5-6');
function score(a: Asset, c: Crit, b: string) {
  const has = (f: string, v?: string) => !!v && (a.tags[f] ?? []).includes(v);
  let s = 0, hits = 0;
  if (has('object', c.object)) { s += 5; hits++; }
  if (has('topic', c.topic)) { s += 4; hits++; }
  if (c.world && (a.world === c.world || has('world', c.world))) { s += 3; hits++; }
  if (has('setting', c.setting)) { s += 2; hits++; }
  if (c.mood && (a.mood === c.mood || has('mood', c.mood))) { s += 2; hits++; }
  if (b && a.band === b) s++;
  return { s, hits };
}
const rv = (child: string, qid: string, aid: string) => createHash('sha256').update(`${child}|${qid}|${aid}`).digest().readBigUInt64BE(0);

/** assetstore.Resolve. childID '' is the admin preview; the pool lists every asset a child could get. */
function resolve(c: Crit, qid: string, b: string, child = ''): { asset: Asset | null; pool: string[]; via: string } {
  const all = hydrate(dbh().prepare(`SELECT id, kind, COALESCE(world_id,'') world, grade_band band, COALESCE(mood,'') mood, alt_fr alt, dominant_color color, lqip, width, height
    FROM assets WHERE review_status = 'approved' AND people_free = 1 AND brand_free = 1 AND (? = '' OR kind = ?) AND grade_band IN ('all', ?)`).all(c.kind ?? '', c.kind ?? '', b) as Record<string, string | number>[]);
  const steps: [string, Crit][] = [['exact', c], ['no mood', { ...c, mood: '' }], ['no mood/setting', { ...c, mood: '', setting: '' }], ['no mood/setting/object', { ...c, mood: '', setting: '', object: '' }]];
  for (const [via, cr] of steps) {
    let pool = all.map((a) => ({ a, ...score(a, cr, b) })).filter((x) => x.hits > 0);
    const best = Math.max(-1, ...pool.map((x) => x.s));
    pool = pool.filter((x) => x.s >= best - 2);
    if (!pool.length) continue;
    const pick = pool.reduce((m, x) => { const wx = rv(child, qid, x.a.id), wm = rv(child, qid, m.a.id); return wx > wm || (wx === wm && x.a.id < m.a.id) ? x : m; });
    return { asset: pick.a, pool: pool.map((x) => x.a.id), via };
  }
  if (c.world) {
    const h = dbh().prepare('SELECT hero_asset_id h FROM worlds WHERE id = ?').get(c.world) as { h?: string } | undefined;
    const a = h?.h ? loadAsset(h.h) : null;
    if (a) return { asset: a, pool: [a.id], via: 'world hero' };
  }
  return { asset: null, pool: [], via: 'none' };
}

const ref = (a: Asset): MediaRef => ({ id: a.id, alt: a.alt, width: a.w, height: a.h, color: a.color, lqip: a.lqip, srcset: a.widths.map((w) => ({ w, url: `${BASE.replace(/\/$/, '')}/${a.id}-${w}.webp` })) });

/** The scene spec the API will send with the question: the routed one (same source as the scene gate), or null when routing refuses. */
export function sceneSpecFor(world: string, seed: unknown): SceneSpec | null {
  const raw = seed as RawQuestion;
  const r = [...PILOT_SCENES, espaceClockDocked].find((p) => p.id === raw.id) ?? routeQuestion(world as 'echecs' | 'medecine' | 'espace', raw);
  return 'spec' in r ? r.spec : null;
}

export function qaBeat(id: string): QaBeat | null {
  const s = allSeeds().get(id);
  if (!s) return null;
  const t = (x?: LText) => x?.fr ?? '';
  const prompt = t(s.prompt), story = t(s.story);
  const q: Question = { kind: s.type as Question['kind'], math_text: s.math_text || prompt, choices: [], prompt, story, hint_available: !!s.hint && !!t(s.hint) };
  if (s.style) q.style = s.style as Question['style'];
  if (s.answer.kind === 'choice') q.choices = shuffled(s.choices ?? [], id, (c) => c.id).map((c) => choiceValue(t(c.text))) as Question['choices'];
  if (s.items) {
    const it = (l: { id: string; text: LText }[]) => l.map((x) => ({ id: x.id, text: t(x.text) }));
    if (Array.isArray(s.items)) {
      let shown = shuffled(s.items, id, (i) => i.id);
      if (s.answer.kind === 'order' && shown.length > 1 && shown.map((i) => i.id).join() === (s.answer.sequence ?? []).join()) shown = [...shown.slice(1), shown[0]];
      q.items = { cards: it(shown) };
    } else q.items = { left: it(s.items.left), right: it(shuffled(s.items.right, id, (i) => i.id)) };
  }
  if (s.visual) q.visual = { kind: s.visual.kind as never, ...(s.visual.data ? { data: s.visual.data } : {}) };
  const media: NonNullable<Question['media']> = [];
  const resolved: QaBeat['debug']['resolved'] = [];
  for (const m of s.media ?? []) {
    if (m.asset) {
      const r = dbh().prepare('SELECT id FROM assets WHERE id = ? OR alias = ?').get(m.asset, m.asset) as { id: string } | undefined;
      const a = r ? loadAsset(r.id) : null;
      resolved.push({ role: m.role, asset: a?.id ?? null, pool: a ? [a.id] : [], via: 'explicit' });
      if (a) media.push({ role: m.role, image: ref(a) });
    } else if (m.criteria) {
      const r = resolve(m.criteria, id, band(s.grade));
      resolved.push({ role: m.role, asset: r.asset?.id ?? null, pool: r.pool, via: r.via });
      if (r.asset) media.push({ role: m.role, image: ref(r.asset), ...(r.via === 'world hero' ? { hero_fallback: true } : {}) });
    }
  }
  q.media = media;
  const a = s.answer;
  const correctAnswer =
    a.kind === 'choice' ? choiceValue(t(s.choices?.find((c) => c.id === a.correct)?.text)) :
    a.kind === 'order' ? a.sequence : a.kind === 'match' ? a.pairs :
    a.kind === 'range' ? (a.exact_for_check ?? ((a.min ?? 0) + (a.max ?? 0)) / 2) : a.value ?? null;
  const spec = sceneSpecFor(s.world, s);
  const entry = spec ? entryOf(spec) : null; // the same split the API delivers: question part now, reveal part with the answer
  if (entry) q.scene = entry.question as never;
  return { id, world: s.world, grade: s.grade, skill: s.skill, question: q, sceneReveal: (entry?.reveal as unknown as Record<string, unknown> | undefined) ?? null, correctAnswer, explain: t(s.explain) || null, debug: { criteria: (s.media ?? []).map((m) => m.criteria ?? {}), resolved } };
}
