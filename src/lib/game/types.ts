// Shared shapes for the local game state. Pure types: no React, no path aliases.

export type WorldId = 'nature' | 'espace' | 'cuisine' | 'sport' | 'construction' | 'medecine' | 'science' | 'echecs';
export type Outcome = 'correct' | 'erreur_typique' | 'erreur_aleatoire';

/** What a challenge card shows. The state core fills it; the card only renders it. */
export type ChallengeView = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  status: 'available' | 'active' | 'done';
  /** Short text such as "Une carte rare". */
  rewardLabel: string;
  /** Emoji or icon name chosen by the catalog. */
  emoji: string;
};

/** A collectible card as the local state stores it. */
export type CardView = {
  id: string;
  world: WorldId;
  title: string;
  earnedAt: string;
  source: 'chapter' | 'challenge' | 'welcome';
};
