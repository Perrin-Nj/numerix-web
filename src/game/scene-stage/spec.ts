// SceneSpec v1: the per-question data an archetype renders. Pure types and validators, no DOM, runnable from node.
import { HOOK_IDS, KO_IDS, OK_IDS } from './moves';
export type Loc = { fr: string; en: string };
export type Locale = 'fr' | 'en';

/** Where a number (or a list of cells) comes from. `answer` is reveal only and never reaches the entrance. */
export type BindSource =
  | { from: 'text'; index: number }
  | { from: 'calc'; index: number }
  | { from: 'math_text'; index: number }
  | { from: 'visual'; pointer: string }
  | { from: 'answer'; reveal_only: true }
  /** A number computed from two bound names (add, sub, mul), e.g. the typical wrong value 20 + 12 = 32 for a ghost. Needs no provenance: its parts have it. */
  | { from: 'derive'; op: 'add' | 'sub' | 'mul'; a: string; b: string; reveal_only?: boolean };

export type PropSpec = {
  id: string;
  /** A literal 0 to 60 or `$name` of a binding. */
  count: number | `$${string}`;
  layout: string;
  lane: 'back' | 'mid' | 'front';
  /** Optional positions (cells) read from the question, so the picture is the question's own. */
  at?: { from: 'visual'; pointer: string };
};

export const CAMERAS = ['dolly-in', 'rise', 'orbit', 'push-side'] as const;
export const LIGHTS = ['warm-left', 'cool-top', 'rim-right', 'sunrise', 'cool-morning', 'ceiling-lamp', 'window-morning', 'pastel-evening'] as const;
export const FX = ['dust', 'glint', 'stars', 'sparkle'] as const;

export type SceneSpec = {
  v: 1;
  archetype: string;
  setting: string;
  subjects: string[];
  /** Story objects this scene draws for its question (objects.ts ids). check-scene-spec: every object the question names is listed here and drawable by the archetype. */
  requires?: string[];
  bind: Record<string, BindSource>;
  props: PropSpec[];
  camera: { preset: (typeof CAMERAS)[number]; tilt_deg: number; drift: 'slow' | 'none' };
  light: { key: (typeof LIGHTS)[number]; fx: (typeof FX)[number][] };
  hook: { kind: (typeof HOOK_IDS)[number]; at_ms: number };
  reveal: { ok: (typeof OK_IDS)[number]; ko: (typeof KO_IDS)[number] };
  /** Ties the spec to its approved scene brief (scene-briefs/<world>.md): keywords per brief line, each must occur in that line (scripts/check-scene-brief.mjs). */
  brief?: { id: string; setting: string[]; camera: string[]; light: string[]; idle: string[]; hook: string[]; ok: string[]; ko: string[] };
  /** `{name}` placeholders are filled from the resolved numbers. `reveal` adds the answer once it is known. */
  alt: Loc & { reveal?: Loc };
};

/** What the question gives the binder. Strings are already in the child's language; digits are language neutral. */
export type SceneSource = {
  id?: string;
  story: string;
  prompt: string;
  math_text?: string;
  calc?: string;
  visual?: { kind: string; data?: Record<string, unknown> } | null;
  correctAnswer?: number | string | null;
};

export type Cell = { x: number; y: number };
export type ResolvedProp = { id: string; count: number; cells?: Cell[]; lane: PropSpec['lane']; layout: string };
export type ResolvedScene = {
  spec: SceneSpec;
  values: Record<string, number>;
  props: Record<string, ResolvedProp>;
  /** Visual kind and data when the question has one the child must read. */
  visual?: SceneSource['visual'];
  revealed: boolean;
  signature: string;
};

export const MAX_PROPS = 60;
export const MAX_LAYERS = 8;
export const MAX_SPEC_BYTES = 4096;

/** Archetypes with their own grouping (tens rods with a numeric label) may exceed MAX_PROPS. */
export const GROUPING_ARCHETYPES: ReadonlySet<string> = new Set<string>([]);

export function signatureOf(s: SceneSpec): string {
  return [s.archetype, s.subjects.join('+'), s.props.map((p) => `${p.id}:${p.layout}`).join('+'), s.camera.preset, s.light.key, s.hook.kind, `${s.reveal.ok}/${s.reveal.ko}`].join('/');
}

/** Structure checks that need no question. Returns human readable problems, empty when fine. */
export function validateSpec(s: SceneSpec, knownArchetypes: readonly string[]): string[] {
  const e: string[] = [];
  if (s.v !== 1) e.push('v must be 1');
  if (!knownArchetypes.includes(s.archetype)) e.push(`unknown archetype ${s.archetype}`);
  if (JSON.stringify(s).length > MAX_SPEC_BYTES) e.push(`spec over ${MAX_SPEC_BYTES} bytes`);
  if (s.props.length > MAX_LAYERS) e.push(`more than ${MAX_LAYERS} prop groups`);
  if (!s.alt.fr || !s.alt.en) e.push('alt needs fr and en');
  if (!(HOOK_IDS as readonly string[]).includes(s.hook.kind)) e.push(`unknown hook ${s.hook.kind}`);
  if (!(OK_IDS as readonly string[]).includes(s.reveal.ok)) e.push(`unknown right move ${s.reveal.ok}`);
  if (!(KO_IDS as readonly string[]).includes(s.reveal.ko)) e.push(`unknown wrong move ${s.reveal.ko}`);
  for (const [name, b] of Object.entries(s.bind)) {
    if (b.from === 'answer' && b.reveal_only !== true) e.push(`bind ${name}: answer must be reveal_only`);
    if (b.from === 'derive' && (!(b.a in s.bind) || !(b.b in s.bind))) e.push(`bind ${name}: derive needs bound ${b.a} and ${b.b}`);
  }
  for (const p of s.props) {
    if (typeof p.count === 'string') {
      if (!p.count.startsWith('$') || !(p.count.slice(1) in s.bind)) e.push(`prop ${p.id}: count ${p.count} has no binding`);
    } else if (p.count < 0 || p.count > MAX_PROPS) e.push(`prop ${p.id}: literal count ${p.count} out of 0..${MAX_PROPS}`);
  }
  const texts = [s.alt.fr, s.alt.en, ...(s.alt.reveal ? [s.alt.reveal.fr, s.alt.reveal.en] : [])];
  for (const t of texts) for (const m of t.matchAll(/\{(\w+)\}/g)) if (!(m[1]! in s.bind)) e.push(`alt uses {${m[1]}} with no binding`);
  return e;
}
