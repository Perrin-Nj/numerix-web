import type { ComponentType } from 'react';
import type { FxStyle } from './fx/Particles';
import type { Locale, ResolvedScene } from './spec';

export type StagePhase = 'question' | 'ok' | 'ko';
export type ArchetypeProps = { scene: ResolvedScene; phase: StagePhase; locale: Locale };
export type ArchetypeModule = { default: ComponentType<ArchetypeProps> };

/** Static facts the stage needs before the chunk arrives: where the sparkles rise from (fractions of the stage) and the sky colour. */
export type ArchetypeMeta = {
  burst: { x: number; y: number };
  /** When the sparkles (ok) or fireflies (ko) start, in ms after the reveal begins, so they follow the story of the reveal instead of preceding it. */
  burstDelay: (s: ResolvedScene, phase: 'ok' | 'ko') => number;
  /** Story-shaped burst: paper stars for chess, bubbles for the clinic, little stars for space. */
  fx: FxStyle;
  sky: string;
  world: 'echecs' | 'medecine' | 'espace';
  /** Story objects this archetype can draw (objects.ts ids): the gate fails a question that names an object outside this list. */
  can: readonly string[];
};

/** Archetype id to lazy chunk. A new archetype adds one line here, one entry in META and one id in the API's seed/scene/archetypes.json. */
const LOADERS: Record<string, () => Promise<ArchetypeModule>> = {
  'echecs.board-row': () => import('./archetypes/board-row'),
  'medecine.dose-vial': () => import('./archetypes/dose-vial'),
  'espace.control-clock': () => import('./archetypes/control-clock'),
  'medecine.clinic-clock': () => import('./archetypes/control-clock'),
  'echecs.grid-board': () => import('./archetypes/board'),
  'medecine.mat-grid': () => import('./archetypes/board'),
  'espace.star-grid': () => import('./archetypes/board'),
  'echecs.piece-bars': () => import('./archetypes/chart'),
  'medecine.shelf-chart': () => import('./archetypes/chart'),
  'espace.star-chart': () => import('./archetypes/chart'),
  'espace.sky-count': () => import('./archetypes/sky-count'),
};

export const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  'echecs.board-row': { burst: { x: 0.5, y: 0.55 }, burstDelay: (_s, p) => (p === 'ok' ? 1500 : 3000), fx: { shape: 'paper', hues: [48, 190, 340, 28] }, sky: '#9fc7e3', world: 'echecs', can: ['pawn', 'board', 'clock', 'trophy'] },
  'medecine.dose-vial': { burst: { x: 0.6, y: 0.45 }, burstDelay: (s, p) => (p === 'ok' ? 950 + (s.values.left ?? 0) * 420 + 300 : 1150 + (s.values.left ?? 0) * 600 + 400), fx: { shape: 'bubble', hues: [175, 190, 48] }, sky: '#bfe6dc', world: 'medecine', can: ['dog', 'drop', 'vial'] },
  'espace.control-clock': { burst: { x: 0.4, y: 0.42 }, burstDelay: () => 700, fx: { shape: 'star', hues: [48, 200, 28] }, sky: '#8fb7e8', world: 'espace', can: ['clock', 'rocket', 'station'] },
};

const gridBurst = (fx: ArchetypeMeta['fx'], sky: string, world: ArchetypeMeta['world'], can: readonly string[]): ArchetypeMeta => ({ burst: { x: 0.5, y: 0.5 }, burstDelay: (_s, p) => (p === 'ok' ? 1400 : 2600), fx, sky, world, can });
const CHESS = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king', 'board', 'chair', 'trophy', 'clock'];
const CLINIC = ['dog', 'cat', 'rabbit', 'mouse', 'plush', 'bandage', 'drop', 'box', 'glove', 'treat', 'kibble', 'bag', 'mat', 'clock', 'scale', 'vial'];
const SPACE = ['rocket', 'station', 'planet', 'star', 'moon', 'astronaut', 'comet', 'satellite', 'capsule', 'sun', 'clock'];
const chessFx = { shape: 'paper', hues: [48, 190, 340, 28] } as const;
const clinicFx = { shape: 'bubble', hues: [175, 190, 48] } as const;
const spaceFx = { shape: 'star', hues: [48, 200, 28] } as const;
ARCHETYPE_META['medecine.clinic-clock'] = gridBurst(clinicFx, '#bfe6dc', 'medecine', ['clock', 'dog']);
ARCHETYPE_META['echecs.grid-board'] = gridBurst(chessFx, '#9fc7e3', 'echecs', CHESS);
ARCHETYPE_META['echecs.piece-bars'] = gridBurst(chessFx, '#9fc7e3', 'echecs', CHESS);
ARCHETYPE_META['medecine.mat-grid'] = gridBurst(clinicFx, '#bfe6dc', 'medecine', CLINIC);
ARCHETYPE_META['medecine.shelf-chart'] = gridBurst(clinicFx, '#bfe6dc', 'medecine', CLINIC);
ARCHETYPE_META['espace.star-grid'] = gridBurst(spaceFx, '#0c1633', 'espace', SPACE);
ARCHETYPE_META['espace.star-chart'] = gridBurst(spaceFx, '#0c1633', 'espace', SPACE);
ARCHETYPE_META['espace.sky-count'] = gridBurst(spaceFx, '#0c1633', 'espace', SPACE);

export const ARCHETYPE_IDS: readonly string[] = Object.keys(LOADERS);

const cache = new Map<string, Promise<ArchetypeModule>>();
/** Loads (once) the chunk of an archetype. Also used to warm the next scene while the child reads the reveal. */
export function loadArchetype(id: string): Promise<ArchetypeModule> {
  const loader = LOADERS[id];
  if (!loader) return Promise.reject(new Error(`unknown scene archetype ${id}`));
  let p = cache.get(id);
  if (!p) {
    p = loader();
    cache.set(id, p);
    p.catch(() => cache.delete(id));
  }
  return p;
}

export function preloadScene(id: string | undefined | null): void {
  if (id && LOADERS[id]) void loadArchetype(id).catch(() => undefined);
}
