// Espace router: the hand-made composition of each espace question (round 5). One row per question id: which archetype, which counted object, which room,
// which numbers of the text (or of the visual, or of the calc) it binds. The generic router (route.ts) is used for the rest (clocks, star grids, pictographs).
// A question with no row falls through to the generic router; a row never types a count: every number is a binding.
import type { BindSource, SceneSpec } from '../../spec';
import { CAMERAS } from '../../spec';
import type { PilotScene } from '../../fixtures/pilot';
import { namedObjects } from '../../objects';
import { numbersIn } from '../../bind';
import type { RawQuestion } from '../../route';
import type { EsRoom } from './Rooms';

type Kind = 'tags' | 'count' | 'hop' | 'chain' | 'gauge' | 'wing' | 'grid';
type Row = {
  k: Kind;
  g: string; // counted object glyph (kit.tsx symbol id)
  room: EsRoom;
  x?: string; // mode inside the archetype
  m?: string; // sub-mode: count (add, sub, pile, packs, share, deal, pairs), tags (plate kind)
  n?: number[]; // text indexes bound as n0, n1, ...
  c?: number[]; // calc indexes bound as n0, n1, ... (when the two languages disagree in the text)
  cnt?: number; // text index of the spelled count of tag rows, bound as `n`
  noun?: string; // key of NOUN when it differs from the glyph
  ans?: boolean; // bind the numeric answer, reveal only
  vis?: string[]; // visual pointers bound as v0, v1...
  no?: string; // refused: no honest picture can bind the numbers
  step?: boolean; // n0 = first written number, n1 = second minus first: the step of a sequence the story lists (the calc never reaches the child)
  b?: BindSource[]; // explicit sources bound as n0, n1, ... (a pictograph count and a text number)
  sel?: number[]; // grid: the visual cells the reveal points at (path: from, to; count: the counted cells; ring: the asked cell)
};
const T = (g: string, room: EsRoom, cnt: number | undefined, o: Partial<Row> = {}): Row => ({ k: 'tags', g, room, cnt, ...o });
const C = (m: string, g: string, room: EsRoom, n: number[], o: Partial<Row> = {}): Row => ({ k: 'count', m, g, room, n, ...o });
const H = (x: string, g: string, room: EsRoom, n: number[], o: Partial<Row> = {}): Row => ({ k: 'hop', x, g, room, n, ...o });
const S = (x: string, g: string, room: EsRoom, n: number[], o: Partial<Row> = {}): Row => ({ k: 'chain', x, g, room, n, ...o });
const G = (x: string, room: EsRoom, n: number[], o: Partial<Row> = {}): Row => ({ k: 'gauge', x, g: 'tank', room, n, ...o });
const W = (x: string, room: EsRoom, n: number[], o: Partial<Row> = {}): Row => ({ k: 'wing', x, g: 'panel', room, n, ...o });
const M = (x: string, sel: number[], o: Partial<Row> = {}): Row => ({ k: 'grid', x, g: 'map', room: 'control', sel, ...o });
const PICT: BindSource = { from: 'visual', pointer: '/data/rows/0/count' };

export const ROWS: Record<string, Row> = {
  // decompte: numbers on rockets, stars, tanks, modules; the number line
  'espace.decompte.101': T('rocket', 'surface', 0),
  'espace.decompte.102': T('star', 'control', 0),
  'espace.decompte.103': H('line', 'rocket', 'surface', [], { ans: true }),
  'espace.decompte.104': T('rocket', 'surface', 0, { n: [1, 2] }),
  'espace.decompte.105': H('line', 'rocket', 'surface', [0, 1], { ans: true }),
  'espace.decompte.106': T('canister', 'cargo', 0, { m: 'code', noun: 'tank' }),
  'espace.decompte.107': T('module', 'cargo', 0, { m: 'code' }),
  // etoiles
  'espace.etoiles.101': C('pairs', 'star', 'quarters', [0]),
  'espace.etoiles.102': S('step', 'star', 'control', [0, 0]), // start 5, step 5: the chain shows 5, 10, 15 (the counts the text gives), 20 at the reveal
  'espace.etoiles.103': C('packs', 'star', 'quarters', [0, 1]),
  'espace.etoiles.104': C('pairs', 'star', 'control', [0]),
  'espace.etoiles.106': T('crew', 'control', 0, { noun: 'team' }),
  'espace.etoiles.105': C('packs', 'star', 'exterior', [], { b: [PICT, { from: 'text', index: 0 }] }),
  'espace.etoiles.107': C('packs', 'star', 'exterior', [0, 1, 2]),
  // equipage
  'espace.equipage.101': C('add', 'crew', 'surface', [0, 1]),
  'espace.equipage.102': C('sub', 'meal', 'quarters', [0, 1]),
  'espace.equipage.103': C('add', 'suit', 'quarters', [0, 1]),
  'espace.equipage.104': C('sub', 'tomato', 'greenhouse', [0, 1]),
  'espace.equipage.105': C('add', 'meal', 'quarters', [0, 1], { noun: 'bagfood' }),
  'espace.equipage.106': C('sub', 'tool', 'exterior', [0, 1]),
  'espace.equipage.107': T('card', 'control', 0, { noun: 'calc' }),
  // fusee: tanks, canisters, bottles
  'espace.fusee.101': C('add', 'canister', 'surface', [0, 1], { noun: 'canister' }),
  'espace.fusee.102': C('sub', 'crew', 'exterior', [0, 1]),
  'espace.fusee.103': G('add', 'cargo', [0, 1]),
  'espace.fusee.104': G('sub', 'surface', [0, 1]),
  'espace.fusee.105': T('card', 'control', undefined, { noun: 'calc' }),
  'espace.fusee.106': C('add', 'canister', 'cargo', [0, 1], { noun: 'bottle' }),
  'espace.fusee.107': G('sub', 'surface', [0, 1]),
  'espace.fusee.108': G('steps', 'surface', [0, 1, 2]),
  'espace.fusee.109': G('two', 'control', [0, 1]),
  'espace.fusee.110': G('bars', 'surface', [], { vis: ['/data/bars/0/value', '/data/bars/1/value', '/data/bars/2/value'] }),
  // horloge (the clock scenes go through the generic control-clock rules); two durations screens
  'espace.horloge.107': T('rocket', 'surface', 0, { m: 'time' }),
  'espace.horloge.108': T('card', 'control', undefined, { noun: 'duration' }),
  // carte
  'espace.carte.106': T('beacon', 'surface', 0),
  'espace.carte.101': M('path', [0, 2]),
  'espace.carte.102': M('count', [1, 2, 3], { ans: true }),
  'espace.carte.103': M('ring', [0]),
  'espace.carte.104': M('rover', [0, 1], { n: [0, 1], ans: true }),
  'espace.carte.105': M('ring', [0]),
  'espace.carte.107': M('count', [0, 1], { ans: true }),
  'espace.carte.108': M('count', [0, 1], { ans: true }),
  'espace.carte.109': M('path', [0, 2]),
  'espace.carte.110': M('path', [2, 0]),
  'espace.orbites.106': M('panels', [], { ans: true }),
  // constellations
  'espace.constellations.101': S('next', 'star', 'control', [0, 1, 2, 3]),
  'espace.constellations.102': S('next', 'star', 'surface', [0, 1, 2, 3]),
  'espace.constellations.103': S('next', 'comet', 'exterior', [0, 1, 2]),
  'espace.constellations.104': S('next', 'star', 'quarters', [0, 1, 2, 3]),
  'espace.constellations.105': T('crew', 'control', 0, { noun: 'team' }),
  'espace.constellations.106': S('rows', 'star', 'exterior', [0, 1, 2]),
  'espace.constellations.107': S('step', 'star', 'control', [0]),
  'espace.constellations.108': S('next', 'star', 'exterior', [0, 1, 2, 3]),
  'espace.constellations.109': S('next', 'star', 'surface', [0, 1, 2, 3]),
  'espace.constellations.110': S('next', 'star', 'exterior', [0, 1, 2, 3, 4]),
  'espace.constellations.111': S('next', 'probe', 'exterior', [0, 1, 2, 3]),
  'espace.constellations.112': S('rule', 'star', 'control', [0, 1, 2, 3]),
  'espace.constellations.113': S('arith4', 'star', 'exterior', [], { step: true }),
  'espace.constellations.114': T('star', 'control', 0, { noun: 'chain' }),
  // orbites: the solar wings
  'espace.orbites.101': W('one', 'exterior', [0, 1]),
  'espace.orbites.102': W('one', 'exterior', [0, 1]),
  'espace.orbites.103': W('one', 'exterior', [0, 1]),
  'espace.orbites.104': W('one', 'exterior', [0, 1]),
  'espace.orbites.105': W('wings', 'exterior', [0, 1, 2]),
  'espace.orbites.107': W('one', 'exterior', [0, 1]),
  'espace.orbites.108': T('panel', 'exterior', 0, { noun: 'wing' }),
  'espace.orbites.109': W('one', 'exterior', [0, 1]),
  'espace.orbites.110': W('broken', 'exterior', [0, 1, 2]),
  // distances
  'espace.distances.101': H('route', 'probe', 'exterior', [0, 1]),
  'espace.distances.102': H('line', 'probe', 'exterior', [], { ans: true }),
  'espace.distances.103': H('route', 'probe', 'exterior', [0, 1]),
  'espace.distances.104': H('route', 'rocket', 'surface', [0, 1], { ans: false }),
  'espace.distances.105': H('route', 'rocket', 'surface', [0, 1]),
  'espace.distances.106': H('line', 'rocket', 'exterior', [], { ans: true }),
  'espace.distances.107': H('route', 'rocket', 'surface', [0, 1], { m: 'remain' }),
  'espace.distances.108': T('probe', 'exterior', 0, { noun: 'orbiter' }),
  'espace.distances.109': H('route', 'probe', 'exterior', [0, 1], { m: 'remain' }),
  // mission: spans of time
  'espace.mission.101': H('span-h', 'crew', 'control', [0]),
  'espace.mission.102': H('span-clock', 'robot', 'exterior', [0, 1, 2, 3]),
  'espace.mission.103': H('span-min', 'shuttle', 'exterior', [0]),
  'espace.mission.104': T('card', 'control', undefined, { noun: 'duration' }),
  'espace.mission.106': C('pile', 'day', 'control', [0]),
  'espace.mission.107': T('card', 'exterior', 0, { noun: 'experiment' }),
  'espace.mission.108': H('span-hm', 'rocket', 'surface', [0, 1]),
  'espace.mission.109': H('span-h', 'probe', 'exterior', [2, 0], { ans: true }),
  // partage: boxes, crates, shuttles, days
  'espace.partage.101': C('share', 'tool', 'cargo', [0, 1], { x: 'box' }),
  'espace.partage.102': C('share', 'mini', 'cargo', [0, 1], { x: 'crate' }),
  'espace.partage.103': C('deal', 'flask', 'quarters', [0, 1], { x: 'crew' }),
  'espace.partage.104': C('share', 'crew', 'surface', [0, 1], { x: 'shuttle' }),
  'espace.partage.105': C('share', 'crew', 'surface', [0, 1], { x: 'shuttle' }),
  'espace.partage.106': T('crew', 'cargo', 0, { noun: 'team' }),
  'espace.partage.107': C('share', 'meal', 'cargo', [], { x: 'box', noun: 'ration', b: [PICT, { from: 'text', index: 0 }] }),
  'espace.partage.108': C('share', 'panel', 'exterior', [0, 1], { x: 'day' }),
  // round 5b: the questions added to the seed (ids .108 and up)
  'espace.decompte.108': H('line', 'rocket', 'surface', [0], { ans: true }),
  'espace.decompte.109': T('rocket', 'cargo', 0, { m: 'code' }),
  'espace.decompte.110': T('card', 'control', undefined, { noun: 'card' }),
  'espace.decompte.111': T('rocket', 'surface', 0),
  'espace.etoiles.108': C('packs', 'star', 'control', [1, 0]),
  'espace.etoiles.109': C('packs', 'star', 'quarters', [0, 1, 2]),
  'espace.etoiles.110': T('crew', 'greenhouse', 0, { noun: 'team' }),
  'espace.equipage.108': C('sub', 'flask', 'quarters', [0, 1]),
  'espace.equipage.109': T('card', 'control', undefined, { noun: 'calc' }),
  'espace.equipage.110': C('gap', 'card', 'control', [0, 1]),
  'espace.horloge.114': T('rocket', 'cargo', 0, { m: 'time' }),
  'espace.carte.111': T('module', 'control', 0, { noun: 'room' }),
  'espace.constellations.115': T('star', 'control', undefined, { noun: 'chain' }),
  'espace.constellations.116': S('next', 'star', 'control', [0, 1, 2, 3]),
  'espace.constellations.117': S('next', 'comet', 'exterior', [0, 1, 2, 3]),
  'espace.constellations.118': T('star', 'quarters', 0, { noun: 'chain' }),
  'espace.constellations.119': S('arith4', 'star', 'quarters', [0, 1]),
  'espace.constellations.120': S('next', 'probe', 'exterior', [0, 1, 2, 3]),
  'espace.constellations.121': S('next', 'star', 'control', [0, 1, 2, 3]),
  'espace.fusee.111': G('sub', 'surface', [0, 1]),
  'espace.fusee.112': C('add', 'battery', 'exterior', [0, 1]),
  'espace.fusee.114': C('add', 'canister', 'cargo', [0, 1], { noun: 'bottle' }),
  'espace.fusee.115': C('steps', 'meal', 'exterior', [0, 1, 2]),
  'espace.fusee.116': G('cmp', 'control', [0, 1]),
  'espace.fusee.113': C('sub', 'meal', 'cargo', [0, 1]),
  'espace.orbites.111': W('one-sat', 'exterior', [0, 1]),
  'espace.orbites.112': W('mixed', 'exterior', [0, 1, 2, 3]),
  'espace.distances.110': H('two', 'probe', 'exterior', [0, 1]),
  'espace.distances.111': H('line', 'probe', 'exterior', [], { ans: true }),
  'espace.distances.112': H('route', 'probe', 'exterior', [0, 1]),
  'espace.mission.110': H('span-hm', 'crew', 'quarters', [0, 1]),
  'espace.mission.111': H('span-dur', 'shuttle', 'exterior', [0, 1, 2]),
  'espace.mission.112': C('pile', 'day', 'control', [0]),
};


const NOUN: Record<string, [string, string, string, string]> = {
  rocket: ['fusée', 'fusées', 'rocket', 'rockets'], mini: ['fusée miniature', 'fusées miniatures', 'miniature rocket', 'miniature rockets'],
  crew: ['astronaute', 'astronautes', 'astronaut', 'astronauts'], tool: ['outil', 'outils', 'tool', 'tools'], tomato: ['tomate', 'tomates', 'tomato', 'tomatoes'],
  canister: ['bidon', 'bidons', 'canister', 'canisters'], bottle: ['bouteille', 'bouteilles', 'bottle', 'bottles'], meal: ['repas', 'repas', 'meal', 'meals'],
  ration: ['ration', 'rations', 'ration', 'rations'], bagfood: ['sac de nourriture', 'sacs de nourriture', 'food bag', 'food bags'], suit: ['combinaison', 'combinaisons', 'space suit', 'space suits'],
  flask: ['gourde', 'gourdes', 'flask', 'flasks'], panel: ['panneau', 'panneaux', 'panel', 'panels'], shuttle: ['navette', 'navettes', 'shuttle', 'shuttles'],
  star: ['étoile', 'étoiles', 'star', 'stars'], comet: ['comète', 'comètes', 'comet', 'comets'], day: ['jour', 'jours', 'day', 'days'], card: ['carte', 'cartes', 'card', 'cards'],
  module: ['module', 'modules', 'module', 'modules'], room: ['salle', 'salles', 'room', 'rooms'], battery: ['pile', 'piles', 'battery', 'batteries'], beacon: ['arrêt', 'arrêts', 'stop', 'stops'], probe: ['sonde', 'sondes', 'probe', 'probes'], tank: ['réservoir', 'réservoirs', 'tank', 'tanks'],
  team: ['équipe', 'équipes', 'team', 'teams'], calc: ['calcul', 'calculs', 'sum', 'sums'], duration: ['durée', 'durées', 'time', 'times'], experiment: ['expérience', 'expériences', 'experiment', 'experiments'],
  chain: ['suite', 'suites', 'pattern', 'patterns'], wing: ['aile solaire', 'ailes solaires', 'solar wing', 'solar wings'], orbiter: ['objet en orbite', 'objets en orbite', 'orbiting object', 'orbiting objects'],
};
const ROOM: Record<EsRoom, [string, string]> = {
  control: ['Dans la salle de contrôle', 'In the control room'], cargo: ['Dans la soute', 'In the cargo bay'], greenhouse: ['Dans la serre', 'In the greenhouse'],
  quarters: ['Dans les quartiers de l’équipage', 'In the crew quarters'], exterior: ['À l’extérieur de la station', 'Outside the station'], surface: ['Sur le sol de la planète, près d’une fusée', 'On the planet surface, next to a rocket'],
};
const nf = (name: string, key: string) => {
  const n = NOUN[key] ?? NOUN.star!;
  return { fr: `{${name}} {${name}:${n[0]}|${n[1]}}`, en: `{${name}} {${name}:${n[2]}|${n[3]}}` };
};
const list = (k: number) => Array.from({ length: k }, (_, i) => `{n${i}}`).join(', ');

function alt(r: Row, q: RawQuestion): SceneSpec['alt'] {
  const rm = ROOM[r.room];
  const key = r.noun ?? r.g;
  const a = nf('n0', key);
  const b = nf('n1', key);
  const at = rm[0];
  const atEn = rm[1];
  switch (r.k) {
    case 'count': {
      if (r.m === 'add') return { fr: `${at} : ${a.fr} d’un côté, et ${b.fr} qui arrivent de l’autre côté.`, en: `${atEn}: ${a.en} on one side, and ${b.en} arriving from the other side.`, reveal: { fr: 'Les deux groupes sont réunis et comptés.', en: 'The two groups are put together and counted.' } };
      if (r.m === 'sub') return { fr: `${at} : ${a.fr}, dont ${b.fr} entourés, prêts à partir.`, en: `${atEn}: ${a.en}, with ${b.en} ringed, ready to go.`, reveal: { fr: 'Ceux qui partent sont retirés ; les autres sont comptés.', en: 'The ones that leave are taken away; the others are counted.' } };
      if (r.m === 'packs') return r.n!.length > 2 ? { fr: `${at} : {n0} paquets de {n1} ${NOUN[key]![1]}, et {n2} ${NOUN[key]![1]} seuls.`, en: `${atEn}: {n0} packs of {n1} ${NOUN[key]![3]}, and {n2} single ones.` } : { fr: `${at} : {n0} paquets de {n1} ${NOUN[key]![1]}.`, en: `${atEn}: {n0} packs of {n1} ${NOUN[key]![3]}.` };
      if (r.m === 'pairs') return { fr: `${at} : {n0} paires de ${NOUN[key]![1]}.`, en: `${atEn}: {n0} pairs of ${NOUN[key]![3]}.` };
      if (r.m === 'gap') return { fr: `${at} : ${nf('n1', key).fr} déjà là, sur {n0} places.`, en: `${atEn}: ${nf('n1', key).en} already there, out of {n0} places.`, reveal: { fr: 'Les places vides se remplissent.', en: 'The empty places fill up.' } };
      if (r.m === 'steps') return { fr: `${at} : ${a.fr}, ${b.fr} qui partent, puis ${nf('n2', key).fr} qui arrivent.`, en: `${atEn}: ${a.en}, ${b.en} leaving, then ${nf('n2', key).en} arriving.` };
      if (r.m === 'pile') return { fr: `${at} : ${a.fr}.`, en: `${atEn}: ${a.en}.` };
      return { fr: `${at} : ${a.fr} en tas, et un conteneur avec {n1} places.`, en: `${atEn}: ${a.en} in a pile, and a container with {n1} places.`, reveal: { fr: 'Les conteneurs se remplissent un à un.', en: 'The containers fill up one by one.' } };
    }
    case 'tags': {
      const sorted = { fr: 'Les plaques montrent leurs nombres et se rangent dans l’ordre.', en: 'The plates show their numbers and move into order.' };
      if (r.cnt === undefined) return { fr: `${at} : des ${NOUN[key]![1]} sur des socles, chacune avec sa plaque, et un membre de l’équipage qui les montre.`, en: `${atEn}: ${NOUN[key]![3]} on stands, each with a plate, and a crew member pointing at them.`, reveal: sorted };
      const nn = nf('n', key);
      return { fr: `${at} : ${nn.fr} sur leurs socles, chacun avec sa plaque.`, en: `${atEn}: ${nn.en} on their stands, each with a plate.`, reveal: sorted };
    }
    case 'grid': {
      const cells = ((q.visual?.data?.cells ?? []) as { label?: { fr?: string; en?: string } }[]).map((c) => c.label);
      const names = (l: 'fr' | 'en') => [...new Set(cells.map((c) => c?.[l]).filter(Boolean))].join(', ');
      const base = { fr: 'Une carte de la base de {cols} {cols:colonne|colonnes} et {rows} {rows:rangée|rangées}, numérotées sur les bords', en: 'A base map of {cols} {cols:column|columns} and {rows} {rows:row|rows}, numbered on the edges' };
      if (r.x === 'panels') return { fr: 'Un module solaire vu de face : {rows} rangées de {cols} panneaux.', en: 'A solar module seen from the front: {rows} rows of {cols} panels.', reveal: { fr: 'Les rangées de panneaux sont comptées.', en: 'The rows of panels are counted.' } };
      if (r.x === 'rover') return { fr: `${base.fr}, avec ${names('fr')}. Un rover attend sur la rampe : {n0} cases à droite, puis {n1} cases vers le bas.`, en: `${base.en}, with ${names('en')}. A rover waits on the ramp: {n0} squares right, then {n1} squares down.`, reveal: { fr: 'Le rover roule case par case jusqu’au dock.', en: 'The rover drives square by square to the dock.' } };
      return { fr: `${base.fr}, avec ${names('fr')}.`, en: `${base.en}, with ${names('en')}.`, reveal: r.x === 'path' ? { fr: 'Un membre de l’équipage marche sur le chemin dessiné.', en: 'A crew member walks along the drawn path.' } : { fr: 'Les cases de la réponse s’allument.', en: 'The cells of the answer light up.' } };
    }
    case 'hop': {
      const x = r.x!;
      if (x === 'line') return r.n!.length === 1 ? { fr: `${at} : une fusée marquée {n0} sur une droite graduée.`, en: `${atEn}: a rocket marked {n0} on a number line.` } : r.n!.length ? { fr: `${at} : une droite graduée avec les cartes {n0} et {n1} et une carte tombée entre elles.`, en: `${atEn}: a number line with the cards {n0} and {n1} and a fallen card between them.` } : { fr: `${at} : une fusée sur une droite graduée, marquée à {n9}.`, en: `${atEn}: a rocket on a number line, marked at {n9}.` };
      if (x === 'two') return { fr: `${at} : un satellite à {n0} km de la Terre et une station à {n1} km.`, en: `${atEn}: a satellite {n0} km from Earth and a station {n1} km from Earth.` };
      if (x === 'span-dur') return { fr: `${at} : une barre de temps qui part de {n0} h {n1:pad2} et dure {n2} minutes.`, en: `${atEn}: a time bar that starts at {n0}:{n1:pad2} and lasts {n2} minutes.` };
      if (x === 'route') return r.m === 'remain' ? { fr: `${at} : un trajet de {n0} km dont {n1} km déjà faits.`, en: `${atEn}: a trip of {n0} km with {n1} km already done.` } : { fr: `${at} : un trajet en deux parties, {n0} km puis {n1} km.`, en: `${atEn}: a trip in two parts, {n0} km then {n1} km.` };
      if (x === 'span-clock') return { fr: `${at} : une barre de temps de {n0} h {n1:pad2} à {n2} h {n3:pad2}.`, en: `${atEn}: a time bar from {n0}:{n1:pad2} to {n2}:{n3:pad2}.`, reveal: { fr: 'Le robot avance heure par heure et la durée s’affiche.', en: 'The robot moves hour by hour and the duration appears.' } };
      if (x === 'span-min') return { fr: `${at} : une barre de temps de {n0} minutes.`, en: `${atEn}: a time bar of {n0} minutes.` };
      if (x === 'span-hm') return { fr: `${at} : une barre de temps de {n0} h {n1:pad2}.`, en: `${atEn}: a time bar of {n0} h {n1:pad2}.` };
      if (r.n!.length > 1) return { fr: `${at} : une barre de temps de {n0} heures, avec un message toutes les {n1} minutes.`, en: `${atEn}: a time bar of {n0} hours, with a message every {n1} minutes.`, reveal: { fr: 'Les messages sont comptés un par un.', en: 'The messages are counted one by one.' } };
      return { fr: `${at} : une barre de temps de {n0} heures.`, en: `${atEn}: a time bar of {n0} hours.` };
    }
    case 'chain': {
      if (r.x === 'step') return { fr: `${at} : des étoiles reliées par des sauts de {n0}.`, en: `${atEn}: stars joined by jumps of {n0}.` };
      if (r.x === 'rows') return { fr: `${at} : des colonnes d’étoiles : ${list(r.n!.length)}.`, en: `${atEn}: columns of stars: ${list(r.n!.length)}.` };
      if (r.x === 'arith4') return { fr: `${at} : des colonnes d’étoiles qui commencent à {n0} et montent de {n1}.`, en: `${atEn}: columns of stars that start at {n0} and go up by {n1}.` };
      return { fr: `${at} : des ${NOUN[r.g]![1]} numérotées ${list(r.n!.length)}, puis une dernière vide.`, en: `${atEn}: numbered ${NOUN[r.g]![3]} ${list(r.n!.length)}, then a last empty one.` };
    }
    case 'gauge': {
      if (r.x === 'bars') return { fr: `${at} : trois réservoirs avec {v0}, {v1} et {v2} litres.`, en: `${atEn}: three tanks with {v0}, {v1} and {v2} litres.` };
      if (r.x === 'two' || r.x === 'cmp') return { fr: `${at} : deux réservoirs, {n0} litres et {n1} litres.`, en: `${atEn}: two tanks, {n0} litres and {n1} litres.` };
      if (r.x === 'steps') return { fr: `${at} : un réservoir de {n0} litres, avec {n1} litres qui sortent et {n2} qui arrivent.`, en: `${atEn}: a tank of {n0} litres, with {n1} litres leaving and {n2} arriving.` };
      return { fr: `${at} : un réservoir de {n0} litres et un tuyau de {n1} litres.`, en: `${atEn}: a tank of {n0} litres and a hose of {n1} litres.` };
    }
    default:
      if (r.x === 'mixed') return { fr: `${at} : deux modules solaires, {n0} rangées de {n1} panneaux et {n2} rangées de {n3} panneaux.`, en: `${atEn}: two solar modules, {n0} rows of {n1} panels and {n2} rows of {n3} panels.` };
      if (r.x === 'one-sat') return { fr: `${at} : un satellite avec {n0} rangées de {n1} panneaux solaires.`, en: `${atEn}: a satellite with {n0} rows of {n1} solar panels.` };
      if (r.x === 'wings') return { fr: `${at} : {n0} ailes solaires de {n1} rangées de {n2} panneaux.`, en: `${atEn}: {n0} solar wings of {n1} rows of {n2} panels.` };
      if (r.x === 'broken') return { fr: `${at} : une aile solaire de {n0} rangées de {n1} panneaux, dont {n2} cassés.`, en: `${atEn}: a solar wing of {n0} rows of {n1} panels, {n2} of them broken.` };
      return { fr: `${at} : une aile solaire de {n0} rangées de {n1} panneaux.`, en: `${atEn}: a solar wing of {n0} rows of {n1} panels.` };
  }
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
type L = { fr: string; en: string };
/** The plates of a tag row, from the question's own cards (order, match) or numeric choices: texts, the slot each takes at the reveal, the matched card, the right one. */
export function plates(q: RawQuestion, lang: 'fr' | 'en') {
  const first = (t: string) => numbersIn(t)[0] ?? Number.NaN;
  const rankBy = (v: number[]) => v.map((x, i) => v.filter((y, j) => y < x || (y === x && j < i)).length);
  const it = q.items;
  if (Array.isArray(it)) {
    const seq = q.answer.sequence ?? [];
    return { t: it.map((x) => x.text[lang]), rank: it.map((x, i) => (seq.includes(x.id) ? seq.indexOf(x.id) : i)), pair: [] as string[], win: -1 };
  }
  if (it) {
    const pair = it.left.map((l) => it.right.find((r) => q.answer.pairs?.some(([a, b]) => a === l.id && b === r.id))?.text[lang] ?? '');
    const v = pair.map(first);
    return { t: it.left.map((x) => x.text[lang]), rank: v.some(Number.isNaN) ? v.map((_, i) => i) : rankBy(v), pair, win: -1, right: it.right.map((x) => x.text[lang]) };
  }
  const ch = q.choices ?? [];
  if (!ch.length || ch.some((c) => Number.isNaN(first(c.text[lang])))) return null;
  return { t: ch.map((c) => c.text[lang]), rank: rankBy(ch.map((c) => first(c.text[lang]))), pair: [] as string[], win: ch.findIndex((c) => c.id === q.answer.correct) };
}
const src = (q: RawQuestion, lang: 'fr' | 'en') => {
  const a = q.answer;
  const correct = typeof a.value === 'number' ? a.value : a.kind === 'choice' ? (q.choices?.find((c) => c.id === a.correct)?.text[lang] ?? null) : null;
  const tag = ROWS[q.id]?.k === 'tags' && !q.visual ? plates(q, lang) : null;
  return { id: q.id, story: q.story[lang], prompt: q.prompt[lang], math_text: q.math_text?.[lang], calc: a.calc, visual: tag ? { kind: 'plates', data: tag } : (q.visual ?? null), correctAnswer: correct };
};
/** Why a named story object is not drawn by this row's scene (null when everything the question names is on screen). Refusal beats a stand-in. */
export function undrawn(named: string[], r: Row): string | null {
  const has = (o: string) => {
    switch (o) {
      case 'station': return r.room === 'exterior';
      case 'rocket': return ['rocket', 'mini'].includes(r.g) || r.room === 'surface';
      case 'comet': return r.g === 'comet';
      case 'satellite': return r.g === 'probe' || r.x === 'one-sat';
      case 'panel': return r.g === 'panel' || r.k === 'wing';
      case 'crate': return ['crate', 'mini'].includes(r.g) || r.room === 'cargo';
      case 'suit': return r.g === 'suit' || r.room === 'quarters';
      case 'clock': return r.room === 'control'; // a wall clock is drawn in the control room when the story names one
      case 'astronaut': case 'people': case 'star': case 'planet': case 'moon': return true;
      default: return false;
    }
  };
  const miss = named.find((o) => !has(o));
  return miss ? `the question names "${miss}" and the ${r.room} scene with ${r.g} does not draw it` : null;
}

/** The hand-made scene of an espace question, or null when no row exists (the generic router then decides). */
export function routeEspace(q: RawQuestion): PilotScene | { id: string; skip: string } | null {
  const r = ROWS[q.id];
  if (!r) return null;
  if (r.no) return { id: q.id, skip: r.no };
  const fr = src(q, 'fr');
  const en = src(q, 'en');
  const h = hash(q.id);
  const bind: Record<string, BindSource> = {};
  r.n?.forEach((idx, k) => (bind[`n${k}`] = { from: 'text', index: idx }));
  if (r.step) Object.assign(bind, { n0: { from: 'text', index: 0, digits: true }, t1: { from: 'text', index: 1, digits: true }, n1: { from: 'derive', op: 'sub', a: 't1', b: 'n0' } });
  r.c?.forEach((idx, k) => (bind[`n${k}`] = { from: 'calc', index: idx }));
  r.vis?.forEach((p, k) => (bind[`v${k}`] = { from: 'visual', pointer: p }));
  r.b?.forEach((b, k) => (bind[`n${k}`] = b));
  if (r.k === 'grid') Object.assign(bind, { cols: { from: 'visual', pointer: '/data/cols' }, rows: { from: 'visual', pointer: '/data/rows' } });
  if (r.cnt !== undefined) bind.n = { from: 'text', index: r.cnt };
  if (r.k === 'hop' && r.x === 'line' && !r.n?.length) bind.n9 = { from: 'visual', pointer: '/data/arrow' };
  if (r.ans) bind.ans = { from: 'answer', reveal_only: true };
  const archetype = { tags: 'espace.tag-row', grid: 'espace.star-grid', count: 'espace.room-count', hop: 'espace.hop-line', chain: 'espace.chain', gauge: 'espace.gauge', wing: 'espace.panel-wing' }[r.k];
  const named = [...new Set([...namedObjects('espace', `${fr.story} ${fr.prompt}`), ...namedObjects('espace', `${en.story} ${en.prompt}`)])];
    const settingBase = `es:${r.k === 'count' ? (r.m ?? '') : r.k === 'tags' ? 'tags' : r.k === 'grid' ? 'grid' : r.k === 'wing' ? 'wing' : r.k}:${r.g}:${r.room}:${r.k === 'count' ? (r.x ?? '') : r.k === 'tags' ? (r.m ?? 'num') : r.k === 'grid' ? [r.x, ...r.sel!].join('.') : r.k === 'hop' && r.m === 'remain' ? `${r.x}-remain` : r.x}`;
  // "the fifth evening": the night the question asks about, so the columns can show it
  const ordWord = (/(premi[eè]re?|deuxi[eè]me|second[e]?|troisi[eè]me|quatri[eè]me|cinqui[eè]me|sixi[eè]me|septi[eè]me|huiti[eè]me|neuvi[eè]me|dixi[eè]me)\s+(?:soir|jour|nuit|passage|terme)/i.exec(fr.prompt)?.[1] ?? '').toLowerCase();
  const ordN = ['premi', 'deuxi', 'troisi', 'quatri', 'cinqui', 'sixi', 'septi', 'huiti', 'neuvi', 'dixi'].findIndex((w) => ordWord.startsWith(w)) + 1 || (ordWord.startsWith('second') ? 2 : 0);
  const setting = ordN && r.k === 'chain' && (r.x === 'rows' || r.x === 'arith4') ? `${settingBase}:o${ordN}` : settingBase;
  const why = r.k === 'grid' ? null : undrawn(named, r); // the map draws every place its cells name
  if (why) return { id: q.id, skip: why };
  const props = r.k === 'count' && r.n && !['share', 'deal', 'gap', 'steps'].includes(r.m ?? '') ? r.n.slice(0, 2).map((_, k) => ({ id: `${r.g}-${k}`, count: `$n${k}` as const, layout: 'cluster', lane: 'mid' as const })) : r.k === 'tags' && r.cnt !== undefined ? [{ id: r.g, count: '$n' as const, layout: 'row', lane: 'mid' as const }] : [];
  const spec: SceneSpec = {
    v: 1,
    archetype,
    setting,
    subjects: [],
    room: r.room,
    requires: named,
    bind,
    props,
    camera: { preset: CAMERAS[h % CAMERAS.length]!, tilt_deg: 3, drift: 'slow' },
    light: { key: (['cool-top', 'rim-right', 'sunrise', 'window-morning'] as const)[(h >>> 3) % 4]!, fx: ['dust'] },
    hook: { kind: (['drop-in', 'pop-in', 'light-sweep'] as const)[(h >>> 5) % 3]!, at_ms: 400 + (h % 5) * 100 },
    reveal: { ok: 'hop-wave', ko: 'recount' },
    brief: { id: q.id, setting: [], camera: [], light: [], idle: [], hook: [], ok: [], ko: [] },
    alt: alt(r, q),
  };
  return { id: q.id, world: 'espace', grade: q.grade, spec, fr, en } as PilotScene;
}
export type { L };
