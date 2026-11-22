// Pilot scenes (T055). Local typed fixtures until the API serves `question.scene` (see specs/001-three-worlds-premium/contract-delta.md).
// The `source` blocks are copied from the seed questions; the specs hold NO hand-typed counts or times: every number is bound.
// Each spec carries a `brief` block: keywords that must occur in the approved scene brief line of its question (scripts/check-scene-brief.mjs).
import type { SceneSource, SceneSpec } from '../spec';

export type PilotScene = { id: string; world: 'echecs' | 'medecine' | 'espace'; grade: number; spec: SceneSpec; fr: SceneSource; en: SceneSource };

const cells = (xs: number[]) => xs.map((x) => ({ x, y: 1 }));

/** echecs.cases.004: "A row of the board has 8 squares. Pawns cover 6 squares. How many squares are free?" (answer 2) */
export const echecsCases004: PilotScene = {
  id: 'echecs.cases.004',
  world: 'echecs',
  grade: 1,
  spec: {
    v: 1,
    archetype: 'echecs.board-row',
    setting: 'club-room-snow-window',
    subjects: ['board', 'pawn'],
    requires: ['board', 'pawn'],
    bind: {
      cols: { from: 'visual', pointer: '/data/cols' },
      covered: { from: 'visual', pointer: '/data/cells' },
      free: { from: 'answer', reveal_only: true },
    },
    props: [{ id: 'pawns', count: '$covered', layout: 'row', lane: 'mid', at: { from: 'visual', pointer: '/data/cells' } }],
    camera: { preset: 'dolly-in', tilt_deg: 3, drift: 'slow' },
    light: { key: 'ceiling-lamp', fx: ['dust'] },
    hook: { kind: 'breathe-gaps', at_ms: 900 },
    reveal: { ok: 'flags-pop', ko: 'step-back-count' },
    brief: { id: 'echecs.cases.004', setting: ['club room', 'window', 'snow'], camera: ['dolly-in', 'front'], light: ['soft', 'overhead', 'lamp'], idle: ['rocks'], hook: ['empty', 'breathe'], ok: ['flag', 'light up'], ko: ['step back', 'count'] },
    alt: {
      fr: 'Une rangée de {cols} cases d’un échiquier, dans une salle de club avec une fenêtre sur la neige. {covered} pions sont posés sur des cases.',
      en: 'One row of {cols} chessboard squares in a club room with a window to the snow. {covered} pawns stand on squares.',
      reveal: { fr: 'Les cases libres portent un drapeau et un numéro : il y en a {free}.', en: 'The free squares carry a flag and a number: there are {free}.' },
    },
  },
  fr: {
    id: 'echecs.cases.004',
    story: 'Une rangée de l’échiquier a 8 cases.',
    prompt: 'Des pions couvrent 6 cases. Combien de cases sont libres ?',
    calc: '8-6',
    visual: { kind: 'grid', data: { cols: 8, rows: 1, board: true, cells: cells([1, 2, 3, 4, 5, 6]) } },
    correctAnswer: 2,
  },
  en: {
    id: 'echecs.cases.004',
    story: 'A row of the board has 8 squares.',
    prompt: 'Pawns cover 6 squares. How many squares are free?',
    calc: '8-6',
    visual: { kind: 'grid', data: { cols: 8, rows: 1, board: true, cells: cells([1, 2, 3, 4, 5, 6]) } },
    correctAnswer: 2,
  },
};

/** medecine.doses.001: "A puppy must take 20 drops. He took 12: how many are left?" (answer 8; typical wrong value 20 + 12 = 32) */
export const medecineDoses001: PilotScene = {
  id: 'medecine.doses.001',
  world: 'medecine',
  grade: 2,
  spec: {
    v: 1,
    archetype: 'medecine.dose-vial',
    setting: 'clinic-corner-doses',
    subjects: ['puppy', 'dropper', 'drops', 'vial'],
    requires: ['dog', 'drop'],
    bind: {
      total: { from: 'text', index: 0 },
      given: { from: 'text', index: 1 },
      left: { from: 'answer', reveal_only: true },
      wrong: { from: 'derive', op: 'add', a: 'total', b: 'given', reveal_only: true },
    },
    props: [
      { id: 'slots', count: '$total', layout: 'vial', lane: 'mid' },
      { id: 'drops', count: '$given', layout: 'vial', lane: 'mid' },
    ],
    camera: { preset: 'rise', tilt_deg: 3, drift: 'slow' },
    light: { key: 'pastel-evening', fx: ['dust'] },
    hook: { kind: 'thought-cloud', at_ms: 600 },
    reveal: { ok: 'fill-hop', ko: 'ghost-sum' },
    brief: { id: 'medecine.doses.001', setting: ['clinic', 'puppy', 'exam table'], camera: ['low', 'tilt up'], light: ['pastel', 'evening'], idle: ['curtain'], hook: ['thought cloud', 'blank'], ok: ['regroup', 'chime', 'smiling'], ko: ['ghost', '32', 'fades'] },
    alt: {
      fr: 'Un chiot regarde un flacon de dose gradué jusqu’à {total}. Il y a {given} gouttes dedans et de la place au-dessus.',
      en: 'A puppy watches a dose vial marked up to {total}. It holds {given} drops with room above.',
      reveal: { fr: 'Le compte-gouttes ajoute les {left} gouttes qui manquent.', en: 'The dropper adds the {left} drops that are missing.' },
    },
  },
  fr: {
    id: 'medecine.doses.001',
    story: 'Léa aide à la clinique des animaux.',
    prompt: 'Un chiot doit prendre 20 gouttes. Il en a pris 12 : combien en reste-t-il ?',
    math_text: '12 + ? = 20',
    calc: '20-12',
    visual: { kind: 'numberline', data: { style: 'vial', max: 20, segments: [{ value: 12, tone: 'a' }] } },
    correctAnswer: 8,
  },
  en: {
    id: 'medecine.doses.001',
    story: 'Lea helps at the animal clinic.',
    prompt: 'A puppy must take 20 drops. He took 12: how many are left?',
    math_text: '12 + ? = 20',
    calc: '20-12',
    visual: { kind: 'numberline', data: { style: 'vial', max: 20, segments: [{ value: 12, tone: 'a' }] } },
    correctAnswer: 8,
  },
};

/** espace.horloge.001: "The control centre clock is round, with a small hand and a big hand. What time does the clock show?" (3 h) */
export const espaceHorloge001: PilotScene = {
  id: 'espace.horloge.001',
  world: 'espace',
  grade: 2,
  spec: {
    v: 1,
    archetype: 'espace.control-clock',
    setting: 'mission-control-window-rocket',
    subjects: ['clock', 'rocket', 'drone'],
    requires: ['clock'],
    bind: {
      hour: { from: 'visual', pointer: '/data/hour' },
      minute: { from: 'visual', pointer: '/data/minute' },
    },
    props: [],
    camera: { preset: 'rise', tilt_deg: 3, drift: 'slow' },
    light: { key: 'window-morning', fx: ['dust'] },
    hook: { kind: 'plume-curl', at_ms: 300 },
    reveal: { ok: 'chime-rocket', ko: 'check-hands' },
    // the approved brief of this 3:00 clock question is filed as espace.horloge.101 in scene-briefs/espace.md
    brief: { id: 'espace.horloge.101', setting: ['mission control', 'window', 'rocket'], camera: ['facing', 'upward tilt'], light: ['morning', 'window'], idle: ['steam', 'drone'], hook: ['plume', 'clock'], ok: ['hour hand', 'glows', 'rocket rises'], ko: ['hands dim', 'long hand', 'pulses'] },
    // the label describes the picture only: it never states the hands or the time before the answer (that would be the answer)
    alt: {
      fr: 'Une très grande horloge ronde dans la salle de contrôle, avec une petite aiguille et une grande aiguille. Derrière la fenêtre, une fusée blanche attend sur son pas de tir et un petit drone passe.',
      en: 'A very big round clock in the mission control room, with a small hand and a big hand. Through the window a white rocket waits on its pad and a small drone passes by.',
      reveal: { fr: 'L’heure est {hour} h {minute:pad2}.', en: 'The time is {hour}:{minute:pad2}.' },
    },
  },
  fr: {
    id: 'espace.horloge.001',
    story: 'L’horloge du centre de contrôle est ronde, avec une petite et une grande aiguille.',
    prompt: 'Quelle heure l’horloge montre-t-elle ?',
    visual: { kind: 'clock', data: { hour: 3, minute: 0, theme: 'space' } },
    correctAnswer: '3 h',
  },
  en: {
    id: 'espace.horloge.001',
    story: 'The control centre clock is round, with a small hand and a big hand.',
    prompt: 'What time does the clock show?',
    visual: { kind: 'clock', data: { hour: 3, minute: 0, theme: 'space' } },
    correctAnswer: '3 h',
  },
};

export const PILOT_SCENES: PilotScene[] = [espaceHorloge001, echecsCases004, medecineDoses001];

export const SCENES_BY_ID: Record<string, PilotScene> = Object.fromEntries(PILOT_SCENES.map((p) => [p.id, p]));
