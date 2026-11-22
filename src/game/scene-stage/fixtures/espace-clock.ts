// First pilot (owner's failure case): the control-room clock question must show the CONTROL ROOM, the big wall clock (any hh:mm) and the cargo rocket
// approaching the station. Built through the router, so the same rules cover every clock question. Raw questions follow the seed shape.
import { routeQuestion, type RawQuestion } from '../route';
import type { PilotScene } from './pilot';

const clock = (id: string, fr: [string, string], en: [string, string], hour: number, minute: number): RawQuestion => ({
  id,
  quest: 'espace.horloge',
  grade: 2,
  story: { fr: fr[0], en: en[0] },
  prompt: { fr: fr[1], en: en[1] },
  visual: { kind: 'clock', data: { hour, minute, theme: 'space' } },
  answer: { kind: 'numeric', value: minute, calc: `${minute}` },
});

/** The owner's example: a little after 2 o'clock, the cargo rocket approaches the station. */
export const RAW_APPROACH = clock('espace.horloge.pilot-approach', ['L’horloge de la salle de contrôle est un peu après 2 h. Une fusée de cargo s’approche de la station.', 'Combien de minutes après 2 h l’horloge montre-t-elle ?'], ['The control room clock is a little after 2. A cargo rocket approaches the station.', 'How many minutes after 2 does the clock show?'], 2, 5);
/** Seed espace.horloge.106 (docked variant, 2:45). */
export const RAW_DOCKED = clock('espace.horloge.106', ['L’horloge de la salle est entre 2 h et 3 h. Une fusée de cargo est arrimée à la station.', 'Combien de minutes après 2 h l’horloge montre-t-elle ?'], ['The room clock is between 2 and 3. A cargo rocket is docked at the station.', 'How many minutes after 2 does the clock show?'], 2, 45);

const must = (r: ReturnType<typeof routeQuestion>): PilotScene => {
  if ('skip' in r) throw new Error(r.skip);
  return r;
};
export const espaceClockApproach: PilotScene = must(routeQuestion('espace', RAW_APPROACH));
export const espaceClockDocked: PilotScene = must(routeQuestion('espace', RAW_DOCKED));
export const FIRST_PILOTS = [espaceClockApproach, espaceClockDocked];
