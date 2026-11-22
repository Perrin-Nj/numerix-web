// Binding layer: turns a SceneSpec plus the question's own data into resolved numbers and props.
// Swappable: today the source comes from a local fixture or the beat payload, later from the API's resolved scene.
import { MAX_PROPS, GROUPING_ARCHETYPES, signatureOf, type BindSource, type Cell, type ResolvedProp, type ResolvedScene, type SceneSource, type SceneSpec } from './spec';

const WORDS: Record<string, number> = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const NUM_RE = new RegExp(String.raw`\d+(?:[.,]\d+)?|\b(?:` + Object.keys(WORDS).join('|') + String.raw`)\b`, 'gi');
/** All numbers in a text, in reading order: digits and the spelled numbers 2 to 12 ("Trois fusées" is 3; "un" and "one" stay articles). A thousands gap ("1 000") is not joined. */
export function numbersIn(text: string | undefined | null): number[] {
  return (text?.match(NUM_RE) ?? []).map((n) => WORDS[n.toLowerCase()] ?? Number(n.replace(',', '.')));
}

function pointer(root: unknown, ptr: string): unknown {
  return ptr.split('/').filter(Boolean).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), root);
}

function readNumber(b: BindSource, src: SceneSource): number | undefined {
  switch (b.from) {
    case 'text':
      return numbersIn(`${src.story} ${src.prompt}`)[b.index];
    case 'calc':
      return numbersIn(src.calc)[b.index];
    case 'math_text':
      return numbersIn(src.math_text)[b.index];
    case 'visual': {
      const v = pointer(src.visual, b.pointer);
      return typeof v === 'number' ? v : Array.isArray(v) ? v.length : undefined;
    }
    case 'derive':
      return undefined;
    case 'answer':
      return typeof src.correctAnswer === 'number' ? src.correctAnswer : numbersIn(String(src.correctAnswer ?? ''))[0];
  }
}

/** Provenance rule (FR-004): a bound number must be readable in the story, prompt, math text, calc or visual. */
export function hasProvenance(n: number, src: SceneSource): boolean {
  const seen = [...numbersIn(src.story), ...numbersIn(src.prompt), ...numbersIn(src.math_text), ...numbersIn(src.calc)];
  if (seen.includes(n)) return true;
  const walk = (o: unknown): boolean => (typeof o === 'number' ? o === n : Array.isArray(o) ? o.length === n || o.some(walk) : o && typeof o === 'object' ? Object.values(o).some(walk) : false);
  return walk(src.visual?.data);
}

/** A scene that cannot be bound to its question (missing number, no provenance, count over the cap). The stage falls back to the calm picture. */
export class SceneBindError extends Error {}

/**
 * Resolve every binding. Throws SceneBindError for a missing number, a number with no provenance,
 * an answer binding unknown at reveal, or a prop count over the cap without grouping.
 */
export function resolveScene(spec: SceneSpec, src: SceneSource, opts: { reveal?: boolean } = {}): ResolvedScene {
  const reveal = Boolean(opts.reveal);
  const values: Record<string, number> = {};
  for (const [name, b] of Object.entries(spec.bind)) {
    if (b.from === 'derive') continue; // second pass, after its parts
    if (b.from === 'answer') {
      if (!reveal) continue; // never in the entrance
      const v = readNumber(b, src);
      if (v === undefined) throw new SceneBindError(`bind ${name}: answer unknown at reveal`);
      values[name] = v;
      continue;
    }
    const v = readNumber(b, src);
    if (v === undefined || !Number.isFinite(v)) throw new SceneBindError(`bind ${name}: no number at ${JSON.stringify(b)}`);
    if (!hasProvenance(v, src)) throw new SceneBindError(`bind ${name}: ${v} is not in the question`);
    values[name] = v;
  }
  for (const [name, b] of Object.entries(spec.bind)) {
    if (b.from !== 'derive') continue;
    if (b.reveal_only && !reveal) continue;
    const x = values[b.a];
    const y = values[b.b];
    if (x === undefined || y === undefined) throw new SceneBindError(`bind ${name}: derive parts ${b.a}, ${b.b} are not resolved`);
    values[name] = b.op === 'add' ? x + y : b.op === 'sub' ? x - y : x * y;
  }
  const props: Record<string, ResolvedProp> = {};
  for (const p of spec.props) {
    const count = typeof p.count === 'number' ? p.count : values[p.count.slice(1)];
    if (count === undefined) throw new SceneBindError(`prop ${p.id}: ${p.count} not resolved`);
    if (count > MAX_PROPS && !GROUPING_ARCHETYPES.has(spec.archetype)) throw new SceneBindError(`prop ${p.id}: ${count} over ${MAX_PROPS} and ${spec.archetype} has no grouping`);
    let cells: Cell[] | undefined;
    if (p.at) {
      const raw = pointer(src.visual, p.at.pointer);
      if (Array.isArray(raw)) cells = raw.filter((c): c is Cell => !!c && typeof (c as Cell).x === 'number' && typeof (c as Cell).y === 'number').map((c) => ({ x: c.x, y: c.y }));
      if (cells && cells.length !== count) throw new SceneBindError(`prop ${p.id}: ${cells.length} cells but count ${count}`);
    }
    props[p.id] = { id: p.id, count, cells, lane: p.lane, layout: p.layout };
  }
  return { spec, values, props, visual: src.visual ?? undefined, revealed: reveal, signature: signatureOf(spec) };
}

/** Tens and ones for archetypes that group above the cap (a rod of ten is drawn with its number). */
export function groupCount(n: number): { tens: number; ones: number } {
  return { tens: Math.floor(n / 10), ones: n % 10 };
}
