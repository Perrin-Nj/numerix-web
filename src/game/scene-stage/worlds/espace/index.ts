import type { ArchetypeMeta, ArchetypeModule } from '../../registry';

// Registry additions of the espace world (round 5): archetype chunks and their static facts. registry.ts spreads these two maps.
export const ESPACE_LOADERS: Record<string, () => Promise<ArchetypeModule>> = {
  'espace.room-count': () => import('./room-count'),
  'espace.tag-row': () => import('./tag-row'),
  'espace.hop-line': () => import('./hop-line'),
  'espace.chain': () => import('./chain'),
  'espace.gauge': () => import('./gauge'),
  'espace.panel-wing': () => import('./panel-wing'),
  'espace.star-grid': () => import('./star-grid'),
  'espace.bay3d': () => import('../../gl3d/Host'),
  'espace.pile3d': () => import('../../gl3d/Host'),
  'espace.track3d': () => import('../../gl3d/Host'),
  'espace.clock3d': () => import('../../gl3d/Host'),
  'espace.grid3d': () => import('../../gl3d/Host'),
  'espace.wing3d': () => import('../../gl3d/Host'),
  'espace.chain3d': () => import('../../gl3d/Host'),
};
const fx = { shape: 'star', hues: [48, 200, 28] } as const;
// objects each espace archetype really draws in its rooms (the crew member is always there; the rocket stands on every surface pad; the station hull is in the exterior)
const CAN = ['rocket', 'star', 'planet', 'moon', 'astronaut', 'people', 'suit', 'panel', 'crate', 'station', 'satellite', 'comet', 'clock'] as const;
const meta = (x: number, y: number): ArchetypeMeta => ({ burst: { x, y }, burstDelay: (_s, p) => (p === 'ok' ? 1500 : 2800), fx, sky: '#0c1633', world: 'espace', can: CAN });
export const ESPACE_META: Record<string, ArchetypeMeta> = {
  'espace.room-count': meta(0.45, 0.45),
  'espace.tag-row': meta(0.45, 0.45),
  'espace.hop-line': meta(0.5, 0.45),
  'espace.chain': meta(0.5, 0.42),
  'espace.gauge': meta(0.4, 0.45),
  'espace.panel-wing': meta(0.45, 0.4),
  'espace.star-grid': meta(0.45, 0.42),
  'espace.bay3d': meta(0.5, 0.45),
  'espace.pile3d': meta(0.5, 0.45),
  'espace.track3d': meta(0.5, 0.45),
  'espace.clock3d': meta(0.5, 0.45),
  'espace.grid3d': meta(0.5, 0.45),
  'espace.wing3d': meta(0.5, 0.45),
  'espace.chain3d': meta(0.5, 0.45),
};
