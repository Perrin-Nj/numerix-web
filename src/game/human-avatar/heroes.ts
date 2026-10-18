import type { WorldId } from '@/data/api/types';

/** First hero of each world in the Go API story kit. The beat does not carry the hero name yet. */
export const HERO_BY_WORLD: Record<WorldId, string> = {
  nature: 'Mira',
  espace: 'Nova',
  cuisine: 'Léo',
  sport: 'Sam',
  construction: 'Bao',
  medecine: 'Noor',
  science: 'Ada',
  echecs: 'Cyrus',
};
