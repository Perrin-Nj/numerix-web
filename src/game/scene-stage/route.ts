// Archetype registry for question families (the "router"): maps a seed question (quest, visual kind, text) to an archetype and builds its SceneSpec
// with every number bound to the question. Pure and node runnable: used by the coverage check, the dev route and (until the API serves `scene`) the play screen.
// A question that no rule fits is REFUSED with a reason, never given a wrong scene or a substitute glyph (a star is not a person, a pawn is not a chair);
// the play screen then falls back to the neutral stage plus the question's own visual.
import { numbersIn, numbersWithPos } from './bind';
import { CONTAINERS, glyphOf, namedObjects, nounAlt, type World } from './objects';
import { GLYPHS } from './kit/glyphs';
import { roomFor } from './kit/worlds';
import type { SceneSource, SceneSpec } from './spec';
import { CAMERAS, MAX_PROPS } from './spec';
import type { PilotScene } from './fixtures/pilot';
import { routeEspace } from './worlds/espace/route';

type L = { fr: string; en: string };
export type RawQuestion = {
  id: string;
  quest: string;
  grade: number;
  story: L;
  prompt: L;
  math_text?: L;
  visual?: { kind: string; data?: Record<string, any> } | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  answer: { kind: string; value?: unknown; calc?: string; correct?: string; sequence?: string[]; pairs?: string[][] };
  choices?: { id: string; text: L; [k: string]: unknown }[];
  /** order and match questions: the cards the child moves (order: a list; match: left and right columns) */
  items?: { id: string; text: L; key?: string }[] | { left: { id: string; text: L }[]; right: { id: string; text: L }[] };
};
export type Routed = PilotScene | { id: string; skip: string };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const LIGHTS: Record<World, SceneSpec['light']['key'][]> = {
  echecs: ['warm-left', 'ceiling-lamp', 'cool-top', 'rim-right'],
  medecine: ['pastel-evening', 'window-morning', 'cool-morning', 'sunrise'],
  espace: ['cool-top', 'rim-right', 'sunrise', 'window-morning'],
};
const HOOKS = ['drop-in', 'pop-in', 'light-sweep'] as const;
const SKY_NOUNS = ['rocket', 'star', 'planet', 'moon', 'astronaut', 'comet', 'satellite', 'capsule', 'sun', 'people', 'suit', 'panel', 'crate'];
const CELLISH = /^(?:cases?|carreaux|carrés?|squares?|tiles?|tuiles?|blocs?|blocks?|cubes?)$/i;
const isGlyph = (g: string) => (GLYPHS as readonly string[]).includes(g);
const CONTAINER_WORD = new RegExp(`^${CONTAINERS.source}$`, 'i');

function source(q: RawQuestion, lang: 'fr' | 'en'): SceneSource {
  const a = q.answer;
  let correct: number | string | null = null;
  if (typeof a.value === 'number') correct = a.value;
  else if (a.kind === 'choice') correct = q.choices?.find((c) => c.id === a.correct)?.text[lang] ?? null;
  else if (a.kind === 'order' && Array.isArray(q.items) && a.sequence) correct = q.items.map((it) => a.sequence!.indexOf(it.id) + 1).join(','); // rank of each card, in card order
  else if (a.kind === 'match' && q.items && !Array.isArray(q.items) && a.pairs) {
    const items = q.items;
    correct = items.left.map((l) => items.right.find((r) => r.id === a.pairs!.find((pr) => pr[0] === l.id)?.[1])?.text[lang] ?? '').join('|');
  }
  return { id: q.id, story: q.story[lang], prompt: q.prompt[lang], math_text: q.math_text?.[lang], calc: a.calc, visual: q.visual ?? null, correctAnswer: correct };
}

/** "4 packs of 10 stars": two consecutive numbers joined by "<container> de|of". Returns their indexes in reading order, the container word and the object word. */
function groupPattern(text: string) {
  const pos = numbersWithPos(text);
  for (let i = 0; i + 1 < pos.length; i++) {
    const a = pos[i]!;
    const b = pos[i + 1]!;
    const mid = /^\s*(\p{L}+)\s*,?\s*(?:de|d['’]|of|avec|with|contenant|containing)\s*$/iu.exec(text.slice(a.end, b.start));
    if (!mid || !CONTAINER_WORD.test(mid[1]!)) continue;
    const after = /^\s*(\p{L}+)/u.exec(text.slice(b.end));
    return { i, n: a.n, m: b.n, container: mid[1]!.toLowerCase(), noun: after?.[1] ?? '' };
  }
  return null;
}
const containerKind = (w: string) => (/table/.test(w) ? 'table' : /caisse|crate|carton|colis/.test(w) ? 'crate' : /rang|row|plateau|tray|étag|shel|assiette|plate|bol|bowl/.test(w) ? 'tray' : 'box');

/** The one object a grid, chart or pictograph counts: from the visual's own icons, else the noun the text names. Undrawable, mixed or unnamed: refuse. */
function countedObject(world: World, v: NonNullable<RawQuestion['visual']>, named: string[]): { glyph: string } | { refuse: string } {
  const icons = new Set<string>();
  const walk = (o: unknown) => {
    if (typeof o === 'string') {
      const m = /^img:(.+)$/.exec(o);
      if (m) icons.add(m[1]!);
    } else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') for (const [k, x] of Object.entries(o)) (k === 'icon' && typeof x === 'string' ? icons.add(x) : walk(x));
  };
  walk(v.data);
  const ALIAS: Record<string, string> = { 'chess-pawn-b': 'pawn', 'chess-rook': 'rook', 'chess-knight': 'knight', 'chess-bishop': 'bishop', 'chess-queen': 'queen', 'chess-king': 'king', 'water-drop': 'drop', tile: 'mat', 'tile-yellow': 'mat', 'tile-blue': 'mat', 'person-man': 'person', 'person-woman': 'person' };
  const glyphs = [...icons].map((i) => ALIAS[i] ?? i);
  const unknown = glyphs.filter((g) => !isGlyph(g));
  if (unknown.length) return { refuse: `the visual counts "${unknown[0]}" and no glyph draws it` };
  const first = glyphs[0];
  if (first) return { glyph: first };
  // no icon: only a noun the question itself names may be drawn
  const g = named.map(glyphOf).find((o) => isGlyph(o) && o !== 'board');
  // nothing named: neutral unit blocks (abstract counting blocks, never a stand-in for a person or an animal)
  return { glyph: g ?? 'cell' };
}

export function routeQuestion(world: World, q: RawQuestion): Routed {
  const skip = (why: string) => ({ id: q.id, skip: why });
  if (world === 'espace') {
    const hand = routeEspace(q);
    if (hand) return hand;
  }
  const fr = source(q, 'fr');
  const en = source(q, 'en');
  const h = hash(q.id);
  const named = [...new Set([...namedObjects(world, `${fr.story} ${fr.prompt}`), ...namedObjects(world, `${en.story} ${en.prompt}`)])];
  const v = q.visual;
  const txtFr = `${fr.story} ${fr.prompt}`;
  const txtEn = `${en.story} ${en.prompt}`;
  const common = {
    v: 1 as const,
    subjects: [],
    requires: named,
    room: roomFor(world, `${txtFr} ${txtEn}`, q.id),
    camera: { preset: CAMERAS[h % CAMERAS.length]!, tilt_deg: 3, drift: 'slow' as const },
    light: { key: LIGHTS[world][(h >>> 3) % 4]!, fx: ['dust' as const] },
    hook: { kind: HOOKS[(h >>> 5) % 3]!, at_ms: 400 + (h % 5) * 100 },
    reveal: { ok: 'hop-wave' as const, ko: 'recount' as const },
  };
  const brief = { id: q.id, setting: [], camera: [], light: [], idle: [], hook: [], ok: [], ko: [] };
  const dressed = common;
  const out = (spec: Omit<SceneSpec, 'v' | 'subjects' | 'requires' | 'camera' | 'light' | 'hook' | 'reveal'> & Partial<SceneSpec>): Routed => ({ id: q.id, world, grade: q.grade, spec: { ...dressed, brief, ...spec } as SceneSpec, fr, en });

  if (v?.kind === 'clock' && (world === 'espace' || world === 'medecine') && typeof v.data?.hour === 'number') {
    const where = world === 'espace' ? (/s.approche|approach|arrive|arriv(?:e|ent|ing)/i.test(txtFr) ? 'approach' : /arrim|dock/i.test(txtFr) ? 'docked' : 'pad') : 'clinic';
    // "three rockets wait outside": the pad shows exactly that many, bound to the number that stands before the noun
    const rocketPos = numbersWithPos(txtFr).find((p) => /^\s*(?:fusées?|fusee)/i.test(txtFr.slice(p.end)));
    const rocketIdx = rocketPos ? numbersIn(txtFr).indexOf(rocketPos.n) : -1;
    const enIdx = numbersIn(txtEn).indexOf(rocketPos?.n ?? -1);
    // "at what time does it finish": the hour hand travels to the numeric answer at the reveal
    const pickText = q.answer.kind === 'choice' ? q.choices?.find((c) => c.id === q.answer.correct)?.text.fr : undefined;
    const ansHour = typeof q.answer.value === 'number' ? q.answer.value : /^(\d{1,2}) h$/.exec(pickText ?? '')?.[1] !== undefined ? Number(/^(\d{1,2}) h$/.exec(pickText ?? '')![1]) : undefined;
    const endsAt = ansHour !== undefined && ansHour >= 1 && ansHour <= 12 && /quelle heure/i.test(txtFr) && ansHour !== v.data.hour;
    // "elle finit à 4 h": the reveal shows the span from the clock time to that hour
    const endMatch = /(?:finit|termine)\s+à\s+(\d{1,2})\s*h/i.exec(txtFr);
    const endIdx = endMatch ? [...txtFr.matchAll(/\d+/g)].findIndex((m) => m.index === txtFr.indexOf(endMatch[1]!, endMatch.index)) : -1;
    const multi = where === 'pad' && rocketIdx >= 0 && rocketIdx === enIdx && rocketPos!.n <= 6;
    return out({
      archetype: world === 'espace' ? 'espace.control-clock' : 'medecine.clinic-clock',
      setting: `${world}-clock-${where}`,
      bind: { hour: { from: 'visual', pointer: '/data/hour' }, minute: { from: 'visual', pointer: '/data/minute' }, ...(endsAt ? { endHour: { from: 'answer' as const, reveal_only: true as const } } : {}), ...(endIdx >= 0 ? { spanEnd: { from: 'text' as const, index: endIdx, digits: true as const } } : {}), ...(multi ? { rockets: { from: 'text' as const, index: rocketIdx } } : {}) },
      props: multi ? [{ id: 'rockets', count: '$rockets', layout: 'pad', lane: 'mid' }] : [],
      hook: { kind: 'sweep-hands', at_ms: 300 },
      reveal: { ok: 'chime-rocket', ko: 'check-hands' },
      alt: {
        fr: world === 'espace' ? `Une très grande horloge ronde dans la salle de contrôle, avec une petite et une grande aiguille. Par la fenêtre : ${multi ? '{rockets} {rockets:fusée|fusées} sur leur pas de tir' : where === 'pad' ? 'une fusée sur son pas de tir' : where === 'approach' ? 'une fusée cargo qui s’approche de la station' : 'une fusée cargo amarrée à la station'}, et un technicien à son poste.` : 'Une très grande horloge ronde dans la salle d’attente de la clinique, avec une petite et une grande aiguille, et un chien près de la fenêtre.',
        en: world === 'espace' ? `A very big round clock in the control room, with a small hand and a big hand. Through the window: ${multi ? '{rockets} {rockets:rocket|rockets} on their pads' : where === 'pad' ? 'a rocket on its pad' : where === 'approach' ? 'a cargo rocket approaching the station' : 'a cargo rocket docked at the station'}, and a technician at the console.` : 'A very big round clock in the clinic waiting room, with a small hand and a big hand, and a dog by the window.',
        reveal: { fr: 'L’heure est {hour} h {minute:pad2}.', en: 'The time is {hour}:{minute:pad2}.' },
      },
    });
  }

  // "n groups of m": the relation is the picture (n containers, m of the named object in each)
  const gf = groupPattern(txtFr);
  const ge = groupPattern(txtEn);
  const overCap = !!gf && (gf.n * gf.m > MAX_PROPS || gf.n > 12);
  // a grid that is a plain n x m mat is drawn as the grid itself (its own cells), not as groups
  if (gf && ge && gf.i === ge.i && !(overCap && v?.kind === 'grid' && ((v.data?.cells ?? []) as unknown[]).length <= MAX_PROPS)) {
    const glyph = CELLISH.test(gf.noun) ? 'cell' : namedObjects(world, gf.noun).map(glyphOf).find(isGlyph);
    if (!glyph) return skip(`"${gf.n} ${gf.container} of ${gf.m} ${gf.noun}": the kit has no glyph for "${gf.noun}"`);
    if (overCap) return skip(`${gf.n} groups of ${gf.m} is over the cap`);
    const nf = nounAlt('m', glyph);
    return out({
      archetype: `${world}.group-by`,
      setting: `${world}-group-${containerKind(gf.container)}`,
      bind: { n: { from: 'text', index: gf.i }, m: { from: 'text', index: gf.i + 1 } },
      props: [{ id: 'groups', count: '$n', layout: 'group', lane: 'mid' }, { id: glyph, count: '$m', layout: 'group', lane: 'mid' }],
      alt: {
        fr: `{n} {n:groupe|groupes}, avec ${nf.fr} dans chacun.`,
        en: `{n} {n:group|groups}, with ${nf.en} in each.`,
      },
    });
  }

  if (v?.kind === 'grid') {
    const cells = (v.data?.cells ?? []) as unknown[];
    if (cells.length > MAX_PROPS) return skip(`grid with ${cells.length} items (cap ${MAX_PROPS}, needs a grouping archetype)`);
    const items = cells.length > 0;
    let glyph = world === 'echecs' ? 'pawn' : world === 'medecine' ? 'mat' : 'star';
    if (items) {
      const c = countedObject(world, v, named);
      if ('refuse' in c) return skip(c.refuse);
      glyph = c.glyph;
    }
    const place = { echecs: ['un échiquier', 'a chessboard'], medecine: ['un plateau de la clinique', 'a clinic tray'], espace: ['une carte des étoiles', 'a star map'] }[world];
    const nf = nounAlt('items', glyph);
    return out({
      archetype: `${world}.${world === 'echecs' ? 'grid-board' : world === 'medecine' ? 'mat-grid' : 'star-grid'}`,
      setting: `${world}-grid-${glyph}`,
      bind: { cols: { from: 'visual', pointer: '/data/cols' }, rows: { from: 'visual', pointer: '/data/rows' }, ...(items ? { items: { from: 'visual', pointer: '/data/cells' } } : {}) },
      props: items ? [{ id: 'items', count: '$items', layout: 'grid', lane: 'mid', at: { from: 'visual', pointer: '/data/cells' } }] : [],
      alt: {
        fr: `${place[0]![0]!.toUpperCase()}${place[0]!.slice(1)} de {cols} {cols:colonne|colonnes} et {rows} {rows:rangée|rangées}${items ? `, avec ${nf.fr} posés` : ''}.`,
        en: `${place[1]![0]!.toUpperCase()}${place[1]!.slice(1)} with {cols} {cols:column|columns} and {rows} {rows:row|rows}${items ? ` and ${nf.en} on it` : ''}.`,
      },
    });
  }
  if (v?.kind === 'bars' || v?.kind === 'pictograph') {
    const bars = (v.data?.bars ?? []) as { value: number }[];
    const rows = (v.data?.rows ?? []) as { count: number }[];
    const tokens = v.kind === 'bars' ? bars.reduce((s, b) => s + (b.value <= 40 ? b.value : 1), 0) : rows.reduce((s, r) => s + r.count, 0);
    if (tokens > MAX_PROPS) return skip(`chart with ${tokens} tokens (cap ${MAX_PROPS})`);
    if (v.kind === 'pictograph' && rows.some((r) => r.count > 30)) return skip('pictograph row over 30');
    const c = countedObject(world, v, named);
    if ('refuse' in c) return skip(c.refuse);
    const isBars = v.kind === 'bars';
    return out({
      archetype: `${world}.${world === 'echecs' ? 'piece-bars' : world === 'medecine' ? 'shelf-chart' : 'star-chart'}`,
      setting: `${world}-chart-${c.glyph}`,
      bind: { n: { from: 'visual', pointer: isBars ? '/data/bars' : '/data/rows' } },
      props: [],
      alt: isBars
        ? { fr: 'Un graphique de {n} {n:colonne|colonnes}, chaque colonne est une pile d’objets de l’histoire.', en: 'A chart of {n} {n:column|columns}, each column is a stack of the story’s objects.' }
        : { fr: 'Un tableau de {n} {n:ligne|lignes}, chaque ligne est une rangée d’objets de l’histoire.', en: 'A table of {n} {n:row|rows}, each row is a line of the story’s objects.' },
    });
  }
  if (!v && world === 'espace') {
    const nums = numbersIn(txtFr).map((n, index) => ({ n, index }));
    const nouns = named.filter((o) => SKY_NOUNS.includes(o));
    const usable = nums.filter((x) => x.n >= 1 && x.n <= 24).slice(0, 3);
    if (!usable.length) return skip('no number in the text to draw');
    if (!nouns.length) return skip('the text names no object the kit can draw');
    return out({
      archetype: 'espace.sky-count',
      setting: 'espace-sky-count',
      bind: Object.fromEntries(usable.map((x, i) => [`g${i}`, { from: 'text' as const, index: x.index }])),
      props: usable.map((_, i) => ({ id: `${glyphOf(nouns[Math.min(i, nouns.length - 1)]!)}-${i}`, count: `$g${i}` as const, layout: 'cluster', lane: 'mid' as const })),
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
