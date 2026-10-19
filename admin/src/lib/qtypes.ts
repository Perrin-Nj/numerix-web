// Question bank types and the client-side mirror of the server rules (seed/README.md "Rules enforced").
// The Go validator stays the authority: POST /questions/validate and every save/transition re-check everything.
import { ApiError } from './api';

export const TYPES = ['numeric', 'choice', 'truefalse', 'order', 'match', 'word', 'visual', 'estimate'] as const;
export type QType = (typeof TYPES)[number];
export const STATUSES = ['draft', 'review', 'published', 'retired'] as const;
export type QStatus = (typeof STATUSES)[number];
export const VISUALS = ['bars', 'pictograph', 'clock', 'numberline', 'grid', 'fraction', 'dice'] as const;

export interface Loc {
  fr: string;
  en: string;
}
export interface Choice {
  id: string;
  text: Loc;
  misconception?: string;
  random?: boolean;
}
export interface OrderItem {
  id: string;
  text: Loc;
  key: string;
}
export interface MatchItems {
  left: { id: string; text: Loc }[];
  right: { id: string; text: Loc }[];
}
export interface CommonError {
  value: number;
  misconception: string;
  feedback: Loc;
}
export interface Answer {
  kind: string;
  value?: number | boolean | number[];
  calc?: string;
  correct?: string;
  calc_choice?: Record<string, string>;
  sequence?: string[];
  by?: 'asc' | 'desc';
  pairs?: string[][];
  misconception?: string;
  min?: number;
  max?: number;
  exact_for_check?: number;
}
export interface Media {
  role: string;
  asset?: string;
  criteria?: Record<string, string>;
}
export interface Question {
  id?: string;
  quest: string;
  skill: string;
  type: QType;
  grade: number;
  difficulty: number;
  story: Loc;
  prompt: Loc;
  math_text?: string;
  visual?: { kind: string; data: unknown };
  choices?: Choice[];
  items?: OrderItem[] | MatchItems;
  answer: Answer;
  common_errors?: CommonError[];
  hint: Loc;
  explain: Loc;
  tags: string[];
  media: Media[];
  status?: string;
  author?: string;
  version?: number;
  source?: string;
  [k: string]: unknown;
}
export interface Issue {
  code: string;
  field: string;
  message: string;
  warning?: boolean;
}
export interface QuestionRow {
  id: string;
  world: string;
  quest: string;
  skill: string;
  type: QType;
  grade: number;
  difficulty: number;
  status: QStatus;
  version: number;
  author: string;
  ai_drafted: boolean;
  prompt_fr: string;
  prompt_en: string;
  updated_at: string;
}
export interface QuestionView {
  id: string;
  world: string;
  quest: string;
  status: QStatus;
  version: number;
  ai_drafted: boolean;
  reviewed_by?: string;
  published_at?: string;
  updated_at: string;
  question: Question;
  versions: VersionRow[];
  issues: Issue[];
}
export interface VersionRow {
  version: number;
  status: string;
  content_hash: string;
  actor: string;
  action: string;
  at: string;
}
export interface QuestRow {
  id: string;
  world: string;
  skill: string;
  name: Loc;
  grade_min: number;
  grade_max: number;
  target_count: number;
}
export interface WorldRow {
  id: string;
  ord: number;
  name: Loc;
  accent_color: string;
}
export interface Coverage {
  quests: { quest: string; world: string; target_count: number; by_status: Record<string, number>; by_type: Record<string, number> }[];
  worlds: { world: string; by_type: Record<string, number>; quota_missing: Record<string, number> }[];
}
export interface AssetRow {
  id: string;
  kind: string;
  world?: string;
  grade_band: string;
  mood?: string;
  alt_fr: string;
  alt_en: string;
  licence: string;
  licence_url: string;
  creator: string;
  source_name: string;
  source_url: string;
  attribution_text: string;
  attribution_required: boolean;
  people_free: boolean;
  brand_free: boolean;
  review_status: string;
  tags: Record<string, string[]>;
  media?: { width: number; height: number; color: string; srcset?: { w: number; url: string }[] };
}

export const emptyLoc = (): Loc => ({ fr: '', en: '' });
export const kindFor = (t: QType, prev?: string): string => {
  if (t === 'choice') return 'choice';
  if (t === 'truefalse' || t === 'order' || t === 'match') return t;
  if (t === 'estimate') return prev === 'choice' ? 'choice' : 'range';
  return prev === 'choice' ? 'choice' : 'numeric'; // numeric, word, visual
};
const letters = 'abcdefgh';
const mkChoices = (): Choice[] => ['a', 'b', 'c'].map((id) => ({ id, text: emptyLoc() }));

/** Reshape a question for another type, keeping the shared texts. */
export function retype(q: Question, t: QType, kind?: string): Question {
  const k = kind ?? kindFor(t, q.answer.kind);
  const n: Question = { ...q, type: t, answer: { kind: k } };
  delete n.choices;
  delete n.items;
  delete n.common_errors;
  if (t !== 'visual') delete n.visual;
  if (t === 'visual') n.visual = q.visual ?? { kind: 'bars', data: {} };
  if (k === 'choice') {
    n.choices = mkChoices();
    n.answer = { kind: 'choice', correct: 'a', calc_choice: {} };
  } else if (k === 'numeric') {
    n.answer = { kind: 'numeric', value: 0, calc: '' };
    n.common_errors = [];
  } else if (k === 'range') {
    n.answer = { kind: 'range', min: 0, max: 0, exact_for_check: 0, calc: '' };
    n.common_errors = [];
  } else if (k === 'truefalse') n.answer = { kind: 'truefalse', value: true };
  else if (k === 'order') {
    n.items = ['a', 'b', 'c'].map((id, i) => ({ id, text: emptyLoc(), key: String(i + 1) }));
    n.answer = { kind: 'order', sequence: ['a', 'b', 'c'], by: 'asc' };
  } else if (k === 'match') {
    n.items = { left: [1, 2, 3].map((i) => ({ id: `l${i}`, text: emptyLoc() })), right: [1, 2, 3].map((i) => ({ id: `r${i}`, text: emptyLoc() })) };
    n.answer = { kind: 'match', pairs: [1, 2, 3].map((i) => [`l${i}`, `r${i}`]) };
  }
  return n;
}

export const newQuestion = (quest?: QuestRow): Question =>
  retype(
    { quest: quest?.id ?? '', skill: quest?.skill ?? '', type: 'numeric', grade: quest?.grade_min ?? 1, difficulty: 1, story: emptyLoc(), prompt: emptyLoc(), hint: emptyLoc(), explain: emptyLoc(), tags: [], media: [], answer: { kind: 'numeric' } },
    'numeric',
  );

export const nextChoiceId = (ids: string[]) => letters.split('').find((l) => !ids.includes(l)) ?? `c${ids.length + 1}`;

/** Sequence of order-item ids sorted by key (numeric when both keys are numbers). */
export function sequenceOf(items: OrderItem[], by: 'asc' | 'desc'): string[] {
  const num = items.every((i) => i.key.trim() !== '' && !Number.isNaN(Number(i.key)));
  const sorted = [...items].sort((a, b) => (num ? Number(a.key) - Number(b.key) : a.key.localeCompare(b.key)));
  if (by === 'desc') sorted.reverse();
  return sorted.map((i) => i.id);
}

// ---------- calc: numbers, + - * / ( ), divmod min max abs round gcd pow sum ----------
// shortcut: floating point with a 1e-9 tolerance, the server uses exact fractions; upgrade when a calc needs 1/3 style exactness.
export type CalcValue = number | number[];
export function evalCalc(src: string): CalcValue {
  const tok = src.match(/\d+(?:\.\d+)?|[A-Za-z_]+|[-+*/(),]|\S/g) ?? [];
  let i = 0;
  const peek = () => tok[i];
  const eat = (s?: string) => {
    if (s !== undefined && tok[i] !== s) throw new Error(`expected ${s}`);
    return tok[i++];
  };
  const num = (v: CalcValue): number => {
    if (typeof v !== 'number') throw new Error('a list cannot be used here');
    return v;
  };
  const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const fns: Record<string, (a: number[]) => CalcValue> = {
    divmod: (a) => [Math.floor(a[0] / a[1]), a[0] - Math.floor(a[0] / a[1]) * a[1]],
    min: (a) => Math.min(...a),
    max: (a) => Math.max(...a),
    abs: (a) => Math.abs(a[0]),
    round: (a) => Math.round(a[0]),
    gcd: (a) => a.reduce(gcd),
    pow: (a) => a[0] ** a[1],
    sum: (a) => a.reduce((x, y) => x + y, 0),
  };
  function atom(): CalcValue {
    const t = eat();
    if (t === undefined) throw new Error('unexpected end');
    if (t === '-') return -num(atom());
    if (t === '+') return num(atom());
    if (t === '(') {
      const v = expr();
      eat(')');
      return v;
    }
    if (/^\d/.test(t)) return Number(t);
    const f = fns[t];
    if (!f) throw new Error(`unknown ${t}`);
    eat('(');
    const args: number[] = [];
    if (peek() !== ')') do args.push(num(expr())); while (peek() === ',' && eat(','));
    eat(')');
    return f(args);
  }
  function term(): CalcValue {
    let v = atom();
    while (peek() === '*' || peek() === '/') {
      const op = eat();
      const r = num(atom());
      if (op === '/' && r === 0) throw new Error('division by zero');
      v = op === '*' ? num(v) * r : num(v) / r;
    }
    return v;
  }
  function expr(): CalcValue {
    let v = term();
    while (peek() === '+' || peek() === '-') v = eat() === '+' ? num(v) + num(term()) : num(v) - num(term());
    return v;
  }
  const v = expr();
  if (i < tok.length) throw new Error(`unexpected ${tok[i]}`);
  return v;
}

export type CalcCheck = { state: 'none' } | { state: 'ok'; value: CalcValue } | { state: 'bad'; reason: string; value?: CalcValue };
const same = (a: CalcValue, b: unknown) =>
  Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, k) => Math.abs(x - Number(b[k])) < 1e-9) : typeof b === 'number' && Math.abs(a - b) < 1e-9;
export function checkCalc(calc: string | undefined, expected: unknown): CalcCheck {
  if (!calc?.trim()) return { state: 'none' };
  try {
    const value = evalCalc(calc);
    return same(value, expected) ? { state: 'ok', value } : { state: 'bad', reason: 'mismatch', value };
  } catch (e) {
    return { state: 'bad', reason: (e as Error).message };
  }
}
const asNum = (s: string): number | null => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

// ---------- validation mirror ----------
const band = (g: number) => (g <= 2 ? 0 : g <= 4 ? 1 : 2);
const LIM = { story: [25, 35, 45], prompt: [20, 30, 40], sentence: [14, 18, 22], option: [8, 10, 12] } as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const DASH = /[–—]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const HURRY = /\b(timer|chrono|minuteur|hurry|d[ée]p[êe]che|vite|quickly)\b/i;

export function clientIssues(q: Question, quest?: QuestRow): Issue[] {
  const out: Issue[] = [];
  const bad = (field: string, code: string, message: string, warning = false) => out.push({ field, code, message, warning });
  const b = band(q.grade);
  const texts: [string, string][] = [];
  const addLoc = (name: string, l: Loc | undefined, req: boolean, wordMax?: number, sentMax?: number) => {
    for (const lang of ['fr', 'en'] as const) {
      const v = l?.[lang] ?? '';
      const f = `${name}.${lang}`;
      if (!v.trim()) {
        if (req) bad(f, 'missing_text', 'required');
        continue;
      }
      texts.push([f, v]);
      if (wordMax && words(v) > wordMax) bad(f, 'too_long', `${words(v)} words, the limit is ${wordMax}`);
      if (sentMax) for (const s of v.split(/[.!?]+/)) if (words(s) > sentMax) bad(f, 'sentence_too_long', `a sentence has ${words(s)} words, the limit is ${sentMax}`);
    }
  };
  addLoc('story', q.story, false, LIM.story[b], LIM.sentence[b]);
  addLoc('prompt', q.prompt, true, LIM.prompt[b], LIM.sentence[b]);
  addLoc('hint', q.hint, true, undefined, LIM.sentence[b]);
  addLoc('explain', q.explain, true, undefined, LIM.sentence[b]);
  if (q.math_text) texts.push(['math_text', q.math_text]);
  for (const c of q.choices ?? []) addLoc(`choices.${c.id}`, c.text, true, LIM.option[b]);
  for (const [f, v] of texts) {
    if (DASH.test(v)) bad(f, 'dash', 'no em or en dash');
    if (EMOJI.test(v)) bad(f, 'emoji', 'no emoji');
    if (HURRY.test(v)) bad(f, 'hurry', 'no timers or hurry words');
  }
  if (!q.quest) bad('quest', 'quest', 'pick a quest');
  else if (quest) {
    if (q.skill !== quest.skill) bad('skill', 'skill_mismatch', `the skill of ${quest.id} is ${quest.skill}`);
    if (q.grade < quest.grade_min || q.grade > quest.grade_max) bad('grade', 'grade_range', `grade ${quest.grade_min} to ${quest.grade_max} for this quest`);
  }
  if (!(q.difficulty >= 1 && q.difficulty <= 5)) bad('difficulty', 'difficulty', 'difficulty is 1 to 5');
  if (q.media.length > 3) bad('media', 'media_max', 'at most 3 media');
  if (q.tags.length < 2) bad('tags', 'tags_few', 'fewer than 2 tags', true);

  const a = q.answer;
  const leak = (v: number) => {
    const re = new RegExp(`(?<![\\d.,])${String(v).replace('.', '[.,]')}(?![\\d]|[.,]\\d)`);
    for (const [f, s] of texts) if (/^(story|prompt|hint|math_text)/.test(f) && re.test(s)) bad(f, 'answer_leak', `the text shows the answer (${v}) before the child answers`);
  };
  if (a.kind === 'numeric') {
    const v = a.value;
    if (v === undefined || (typeof v !== 'boolean' && !(Array.isArray(v) ? v.length === 2 && v.every(Number.isFinite) : Number.isFinite(v)))) bad('answer.value', 'answer_value', 'the answer must be a number');
    else if (typeof v === 'number') leak(v);
    if (!a.calc?.trim()) bad('answer.calc', 'no_calc', 'no calc: the answer is unverified', true);
    else if (checkCalc(a.calc, v).state === 'bad') bad('answer.calc', 'calc_mismatch', `calc "${a.calc}" does not give the answer`);
    for (const [i, e] of (q.common_errors ?? []).entries()) {
      if (e.value === a.value) bad(`common_errors.${i}.value`, 'error_is_answer', 'a common error cannot equal the answer');
      if (!e.misconception) bad(`common_errors.${i}.misconception`, 'missing_misconception', 'pick a code');
      addLoc(`common_errors.${i}.feedback`, e.feedback, true);
    }
  } else if (a.kind === 'range') {
    const { min = NaN, max = NaN, exact_for_check: x = NaN } = a;
    if (![min, max, x].every(Number.isFinite) || min > x || x > max) bad('answer', 'range', 'min <= exact <= max');
    else if (max - min > Math.abs(x) * 0.2) bad('answer', 'range_wide', 'max - min must be at most 20% of the value');
    if (!a.calc?.trim()) bad('answer.calc', 'no_calc', 'no calc: the answer is unverified', true);
    else if (checkCalc(a.calc, x).state === 'bad') bad('answer.calc', 'calc_mismatch', `calc "${a.calc}" does not give ${x}`);
  } else if (a.kind === 'choice') {
    const cs = q.choices ?? [];
    if (cs.length < 3 || cs.length > 5) bad('choices', 'choice_count', '3 to 5 choices');
    if (!cs.some((c) => c.id === a.correct)) bad('answer.correct', 'correct_missing', 'the correct choice is not in the list');
    const seen = new Set<string>();
    for (const c of cs) {
      const k = `${c.text.fr}|${c.text.en}`.toLowerCase();
      if (c.text.fr.trim() && seen.has(k)) bad(`choices.${c.id}`, 'duplicate', 'two choices are identical');
      seen.add(k);
      if (c.id !== a.correct && !c.misconception && !c.random) bad(`choices.${c.id}.misconception`, 'missing_misconception', 'a wrong choice needs a code (or random)');
    }
    if (cs.filter((c) => c.random).length > 1) bad('choices', 'random_max', 'at most 1 random choice');
    const cc = a.calc_choice?.[a.correct ?? ''];
    const ct = cs.find((c) => c.id === a.correct)?.text.fr;
    const ctn = ct === undefined ? null : asNum(ct);
    if (!cc?.trim()) bad('answer.calc_choice', 'no_calc', 'no calc for the correct choice: unverified', true);
    else if (ctn !== null && checkCalc(cc, ctn).state === 'bad') bad('answer.calc_choice', 'calc_mismatch', `calc "${cc}" does not give "${ct}"`);
    if (ctn !== null) leak(ctn);
  } else if (a.kind === 'truefalse') {
    if (typeof a.value !== 'boolean') bad('answer.value', 'answer_value', 'true or false');
  } else if (a.kind === 'order') {
    const items = (q.items as OrderItem[] | undefined) ?? [];
    if (items.length < 3) bad('items', 'items_few', 'at least 3 items');
    for (const it of items) addLoc(`items.${it.id}`, it.text, true, LIM.option[b]);
    const want = sequenceOf(items, a.by ?? 'asc');
    if (want.join() !== (a.sequence ?? []).join()) bad('answer.sequence', 'sequence', 'the sequence does not follow the keys');
    if (new Set(items.map((i) => i.key)).size < items.length) bad('items', 'key_tie', 'two items have the same key', true);
  } else if (a.kind === 'match') {
    const it = q.items as MatchItems | undefined;
    for (const s of ['left', 'right'] as const) for (const x of it?.[s] ?? []) addLoc(`items.${x.id}`, x.text, true, LIM.option[b]);
    const ls = (a.pairs ?? []).map((p) => p[0]);
    if (!it || it.left.length < 2 || it.left.some((l) => !ls.includes(l.id))) bad('answer.pairs', 'pairs', 'every left item needs a pair');
    if ((a.pairs ?? []).some((p) => !it?.right.some((r) => r.id === p[1]))) bad('answer.pairs', 'pairs', 'a pair points to a missing right item');
  }
  if (a.kind !== 'choice' && ['truefalse', 'order', 'match'].includes(a.kind) && !a.misconception) bad('answer.misconception', 'missing_misconception', 'pick the code a wrong answer shows');
  if (q.type === 'visual' && !q.visual) bad('visual', 'visual_missing', 'a visual question needs a visual');
  return out;
}

// ---------- helpers ----------
export const problemOf = (e: unknown): { code?: string; errors?: { field: string; message: string }[]; detail?: string } =>
  e instanceof ApiError && e.body && typeof e.body === 'object' ? (e.body as never) : {};

/** Flat path -> value map of a question, for the version diff. */
export function flatten(v: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (v !== null && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
    if (Array.isArray(v) && v.length === 0) out[prefix] = '[]';
  } else out[prefix] = JSON.stringify(v);
  return out;
}
const SKIP = new Set(['version', 'status', 'author', 'source', 'reviewed_by', 'id']);
export function diffQuestions(a: Question, b: Question): { path: string; from?: string; to?: string }[] {
  const fa = flatten(a);
  const fb = flatten(b);
  const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => !SKIP.has(k)).sort();
  return keys.filter((k) => fa[k] !== fb[k]).map((k) => ({ path: k, from: fa[k], to: fb[k] }));
}

/** Smallest responsive variant of an asset, through the admin origin. */
export const thumb = (a: Pick<AssetRow, 'id' | 'media'>) => `/api/media/${a.media?.srcset?.[0]?.url.split('/').pop() ?? `${a.id}.webp`}`;
export const thumbById = (id: string) => `/api/media/${id}.webp`;
