// Archetype registry for question families (the "router"): maps a seed question (quest, visual kind, text) to an archetype and builds its SceneSpec
// with every number bound to the question. Pure and node runnable: used by the coverage check, the dev route and (until the API serves `scene`) the play screen.
// A question that no rule fits is reported with a reason, never given a wrong scene.
import { numbersIn } from './bind';
import { namedObjects, type World } from './objects';
import type { SceneSource, SceneSpec } from './spec';
import { CAMERAS, MAX_PROPS } from './spec';
import type { PilotScene } from './fixtures/pilot';

type L = { fr: string; en: string };
export type RawQuestion = {
  id: string;
  quest: string;
  grade: number;
  story: L;
  prompt: L;
  math_text?: L;
  visual?: { kind: string; data?: Record<string, any> } | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  answer: { kind: string; value?: unknown; calc?: string; correct?: string };
  choices?: { id: string; text: L; [k: string]: unknown }[];
};
export type Routed = PilotScene | { id: string; skip: string };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const LIGHTS: Record<World, SceneSpec['light']['key'][]> = {
  echecs: ['warm-left', 'ceiling-lamp', 'cool-top', 'rim-right'],
  medecine: ['pastel-evening', 'window-morning', 'cool-morning', 'sunrise'],
  espace: ['cool-top', 'rim-right', 'sunrise', 'window-morning'],
};
const HOOKS = ['drop-in', 'pop-in', 'light-sweep'] as const;

function source(q: RawQuestion, lang: 'fr' | 'en'): SceneSource {
  const a = q.answer;
  let correct: number | string | null = null;
  if (typeof a.value === 'number') correct = a.value;
  else if (a.kind === 'choice') correct = q.choices?.find((c) => c.id === a.correct)?.text[lang] ?? null;
  return { id: q.id, story: q.story[lang], prompt: q.prompt[lang], math_text: q.math_text?.[lang], calc: a.calc, visual: q.visual ?? null, correctAnswer: correct };
}

const DEFAULT_NOUN: Record<string, string> = { constellations: 'star', etoiles: 'star', fusee: 'rocket', mission: 'rocket', decompte: 'rocket', orbites: 'planet', equipage: 'astronaut', distances: 'planet', partage: 'star' };
const SKY_NOUNS = ['rocket', 'star', 'planet', 'moon', 'astronaut', 'comet', 'satellite', 'capsule', 'sun'];

export function routeQuestion(world: World, q: RawQuestion): Routed {
  const skip = (why: string) => ({ id: q.id, skip: why });
  const fr = source(q, 'fr');
  const en = source(q, 'en');
  const h = hash(q.id);
  const named = [...new Set([...namedObjects(world, `${fr.story} ${fr.prompt}`), ...namedObjects(world, `${en.story} ${en.prompt}`)])];
  const v = q.visual;
  const common = {
    v: 1 as const,
    subjects: [],
    requires: named,
    camera: { preset: CAMERAS[h % CAMERAS.length]!, tilt_deg: 3, drift: 'slow' as const },
    light: { key: LIGHTS[world][(h >>> 3) % 4]!, fx: ['dust' as const] },
    hook: { kind: HOOKS[(h >>> 5) % 3]!, at_ms: 400 + (h % 5) * 100 },
    reveal: { ok: 'hop-wave' as const, ko: 'recount' as const },
  };
  const brief = { id: q.id, setting: [], camera: [], light: [], idle: [], hook: [], ok: [], ko: [] };
  const out = (spec: Omit<SceneSpec, 'v' | 'subjects' | 'requires' | 'camera' | 'light' | 'hook' | 'reveal'> & Partial<SceneSpec>): Routed => ({ id: q.id, world, grade: q.grade, spec: { ...common, brief, ...spec } as SceneSpec, fr, en });

  if (v?.kind === 'clock' && (world === 'espace' || world === 'medecine') && typeof v.data?.hour === 'number') {
    const t = `${fr.story} ${fr.prompt}`;
    const where = world === 'espace' ? (/s.approche|approach/i.test(t) ? 'approach' : /arrim|dock/i.test(t) ? 'docked' : 'pad') : 'clinic';
    return out({
      archetype: world === 'espace' ? 'espace.control-clock' : 'medecine.clinic-clock',
      setting: `${world}-clock-${where}`,
      bind: { hour: { from: 'visual', pointer: '/data/hour' }, minute: { from: 'visual', pointer: '/data/minute' } },
      props: [],
      hook: { kind: 'sweep-hands', at_ms: 300 },
      reveal: { ok: 'chime-rocket', ko: 'check-hands' },
      alt: {
        fr: world === 'espace' ? 'Une très grande horloge ronde dans la salle de contrôle, avec une petite et une grande aiguille. Dehors, une fusée, la station et un petit drone.' : 'Une très grande horloge ronde dans la salle de la clinique, avec une petite et une grande aiguille, et un chien à la fenêtre.',
        en: world === 'espace' ? 'A very big round clock in the control room, with a small hand and a big hand. Outside: a rocket, the station and a small drone.' : 'A very big round clock in the clinic room, with a small hand and a big hand, and a dog at the window.',
        reveal: { fr: 'L’heure est {hour} h {minute:pad2}.', en: 'The time is {hour}:{minute:pad2}.' },
      },
    });
  }
  if (v?.kind === 'grid') {
    const cells = (v.data?.cells ?? []) as unknown[];
    if (cells.length > MAX_PROPS) return skip(`grid with ${cells.length} items (cap ${MAX_PROPS}, needs a grouping archetype)`);
    const place = { echecs: ['un échiquier', 'a chessboard'], medecine: ['un tapis de la clinique', 'a clinic mat'], espace: ['une carte des étoiles', 'a star map'] }[world];
    const items = cells.length > 0;
    return out({
      archetype: `${world}.${world === 'echecs' ? 'grid-board' : world === 'medecine' ? 'mat-grid' : 'star-grid'}`,
      setting: `${world}-grid`,
      bind: { cols: { from: 'visual', pointer: '/data/cols' }, rows: { from: 'visual', pointer: '/data/rows' }, ...(items ? { items: { from: 'visual', pointer: '/data/cells' } } : {}) },
      props: items ? [{ id: 'items', count: '$items', layout: 'grid', lane: 'mid', at: { from: 'visual', pointer: '/data/cells' } }] : [],
      alt: {
        fr: `${place[0]![0]!.toUpperCase()}${place[0]!.slice(1)} de {cols} colonnes et {rows} rangées${items ? ', avec {items} éléments posés' : ''}.`,
        en: `${place[1]![0]!.toUpperCase()}${place[1]!.slice(1)} with {cols} columns and {rows} rows${items ? ' and {items} items on it' : ''}.`,
      },
    });
  }
  if (v?.kind === 'bars' || v?.kind === 'pictograph') {
    const bars = (v.data?.bars ?? []) as { value: number }[];
    const rows = (v.data?.rows ?? []) as { count: number }[];
    const tokens = v.kind === 'bars' ? bars.reduce((s, b) => s + (b.value <= 12 ? b.value : 1), 0) : rows.reduce((s, r) => s + r.count, 0);
    if (tokens > MAX_PROPS) return skip(`chart with ${tokens} tokens (cap ${MAX_PROPS})`);
    if (v.kind === 'pictograph' && rows.some((r) => r.count > 30)) return skip('pictograph row over 30');
    const isBars = v.kind === 'bars';
    return out({
      archetype: `${world}.${world === 'echecs' ? 'piece-bars' : world === 'medecine' ? 'shelf-chart' : 'star-chart'}`,
      setting: `${world}-chart`,
      bind: { n: { from: 'visual', pointer: isBars ? '/data/bars' : '/data/rows' } },
      props: [],
      alt: isBars
        ? { fr: 'Un graphique de {n} colonnes, chaque colonne est une pile de personnages.', en: 'A chart of {n} columns, each column is a stack of characters.' }
        : { fr: 'Un tableau de {n} lignes, chaque ligne est une rangée de personnages.', en: 'A table of {n} rows, each row is a line of characters.' },
    });
  }
  if (!v && world === 'espace') {
    const txt = `${fr.story} ${fr.prompt}`;
    const nums = numbersIn(txt).map((n, index) => ({ n, index }));
    const nouns = named.filter((o) => SKY_NOUNS.includes(o));
    if (!nouns.length) nouns.push(DEFAULT_NOUN[q.quest.split('.')[1]!] ?? 'star');
    const usable = nums.filter((x) => x.n >= 1 && x.n <= 24).slice(0, 3);
    if (!usable.length) return skip('no number in the text to draw');
    return out({
      archetype: 'espace.sky-count',
      setting: 'espace-sky-count',
      bind: Object.fromEntries(usable.map((x, i) => [`g${i}`, { from: 'text' as const, index: x.index }])),
      props: usable.map((_, i) => ({ id: `${nouns[Math.min(i, nouns.length - 1)]!}-${i}`, count: `$g${i}` as const, layout: 'cluster', lane: 'mid' as const })),
      alt: {
        fr: `Des groupes d’objets dans l’espace : ${usable.map((_, i) => `{g${i}}`).join(', ')}.`,
        en: `Groups of objects in space: ${usable.map((_, i) => `{g${i}}`).join(', ')}.`,
      },
    });
  }
  if (v?.kind === 'numberline' && world === 'medecine' && v.data?.style === 'vial' && typeof q.answer.value === 'number') {
    const given = v.data?.segments?.[0]?.value;
    const max = v.data?.max;
    if (typeof given !== 'number' || typeof max !== 'number' || given + q.answer.value !== max) return skip('vial numberline that is not total = given + answer');
    return out({
      archetype: 'medecine.dose-vial',
      setting: 'clinic-corner-doses',
      bind: { total: { from: 'visual', pointer: '/data/max' }, given: { from: 'visual', pointer: '/data/segments/0/value' }, left: { from: 'answer', reveal_only: true }, wrong: { from: 'derive', op: 'add', a: 'total', b: 'given', reveal_only: true } },
      props: [{ id: 'slots', count: '$total', layout: 'vial', lane: 'mid' }, { id: 'drops', count: '$given', layout: 'vial', lane: 'mid' }],
      hook: { kind: 'thought-cloud', at_ms: 600 },
      reveal: { ok: 'fill-hop', ko: 'ghost-sum' },
      alt: {
        fr: 'Un animal regarde un flacon de dose gradué jusqu’à {total}. Il y a {given} gouttes dedans et de la place au-dessus.',
        en: 'An animal watches a dose vial marked up to {total}. It holds {given} drops with room above.',
        reveal: { fr: 'Le compte-gouttes ajoute les {left} gouttes qui manquent.', en: 'The dropper adds the {left} drops that are missing.' },
      },
    });
  }
  return skip(`no archetype for ${q.quest} with visual ${v?.kind ?? 'none'}`);
}
