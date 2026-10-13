// Static game catalog shared by the local state: worlds, skills, misconceptions, challenges.
// Mirrors what the server will own later (BE-20, BE-21). Pure data, bilingual.
import type { WorldId } from './types.ts';

export type Lang = 'fr' | 'en';
export type L10n = { fr: string; en: string };

/**
 * All story worlds in display order. Selectors loop over it to aggregate per world; keep it in sync with the
 * WORLDS keys.
 */
export const WORLD_IDS: WorldId[] = ['nature', 'espace', 'cuisine', 'sport', 'construction', 'medecine', 'science', 'echecs'];

/**
 * Per-world display data, bilingual: name, one-line hook and accent colour (hex). Keyed by WorldId, so adding a
 * world forces an entry here.
 */
export const WORLDS: Record<WorldId, { name: L10n; hook: L10n; accent: string }> = {
  nature: { name: { fr: 'Nature', en: 'Nature' }, hook: { fr: 'Explore la forêt et ses secrets', en: 'Explore the forest and its secrets' }, accent: '#3FA34D' },
  espace: { name: { fr: 'Espace', en: 'Space' }, hook: { fr: 'Une mission vers les étoiles', en: 'A mission to the stars' }, accent: '#5B5BD6' },
  cuisine: { name: { fr: 'Cuisine', en: 'Cooking' }, hook: { fr: 'Un grand repas à préparer', en: 'A big meal to cook' }, accent: '#F07E2B' },
  sport: { name: { fr: 'Sport', en: 'Sport' }, hook: { fr: 'Le grand match approche', en: 'The big match is coming' }, accent: '#1E88E5' },
  construction: { name: { fr: 'Construction', en: 'Building' }, hook: { fr: 'Bâtis quelque chose d’incroyable', en: 'Build something amazing' }, accent: '#E0A100' },
  medecine: { name: { fr: 'Médecine', en: 'Medicine' }, hook: { fr: 'Soigne et sauve la journée', en: 'Heal and save the day' }, accent: '#14A0A0' },
  science: { name: { fr: 'Science', en: 'Science' }, hook: { fr: 'Le laboratoire a besoin de toi', en: 'The lab needs you' }, accent: '#8E44AD' },
  echecs: { name: { fr: 'Échecs', en: 'Chess' }, hook: { fr: 'Un tournoi t’attend', en: 'A tournament awaits' }, accent: '#4A5568' },
};

/** The seven skills of the demo path, in order. Every world offers all of them. */
export const SKILLS: { id: string; label: L10n; col: number; misconception: { code: string; description: L10n } }[] = [
  { id: 'ARI-OPE-A02a', label: { fr: 'Additions rapides', en: 'Quick sums' }, col: 2, misconception: { code: 'retenue_oubliee', description: { fr: 'Oublie la retenue dans une addition', en: 'Forgets to carry in an addition' } } },
  { id: 'ARI-OPE-A03a', label: { fr: 'Calcul mental', en: 'Mental math' }, col: 3, misconception: { code: 'dizaine_decalee', description: { fr: 'Se trompe d’une dizaine en calculant de tête', en: 'Is off by a ten when calculating in the head' } } },
  { id: 'ARI-OPE-A05', label: { fr: 'Le terme manquant', en: 'The missing term' }, col: 2, misconception: { code: 'operation_directe', description: { fr: 'Additionne au lieu de retrouver le terme manquant', en: 'Adds instead of finding the missing term' } } },
  { id: 'ARI-OPE-A06a', label: { fr: 'Les tables', en: 'Times tables' }, col: 1, misconception: { code: 'addition_facteurs', description: { fr: 'Additionne les facteurs au lieu de les multiplier', en: 'Adds the factors instead of multiplying them' } } },
  { id: 'ARI-SOP-A03a', label: { fr: 'Partager et grouper', en: 'Share and group' }, col: 2, misconception: { code: 'partage_vs_contenance', description: { fr: 'Confond le nombre de parts et la taille d’une part', en: 'Mixes up the number of shares and the size of a share' } } },
  { id: 'ARI-OPE-A07a', label: { fr: 'Division avec reste', en: 'Division with remainder' }, col: 3, misconception: { code: 'reste_ignore', description: { fr: 'Ignore le reste dans une division', en: 'Ignores the remainder in a division' } } },
  { id: 'ARI-SEN-A01c', label: { fr: 'Grands nombres', en: 'Big numbers' }, col: 2, misconception: { code: 'retenue_grands_nombres', description: { fr: 'Oublie une retenue avec les grands nombres', en: 'Forgets a carry with big numbers' } } },
];

/**
 * Finds a skill in SKILLS by its id, or undefined for an unknown id. Selectors use it to attach labels and
 * misconceptions to answers.
 */
export const skillById = (id: string) => SKILLS.find((s) => s.id === id);

export type ChallengeMetric = 'chapters_done' | 'correct_streak' | 'worlds_played' | 'likes' | 'puzzles_correct' | 'days_played';

/**
 * The challenge catalog. Each one counts a metric (chapters, streak, worlds, likes, puzzles, days) since the
 * child accepted it, and pays a card in its world when target is reached. Progress logic lives in
 * selectors.challengeViews.
 */
export const CHALLENGES: {
  id: string;
  emoji: string;
  metric: ChallengeMetric;
  target: number;
  title: L10n;
  description: L10n;
  reward: L10n;
  cardTitle: L10n;
  world: WorldId;
}[] = [
  { id: 'first_steps', emoji: '👣', metric: 'chapters_done', target: 1, title: { fr: 'Premiers pas', en: 'First steps' }, description: { fr: 'Termine un chapitre jusqu’au bout.', en: 'Finish one chapter all the way.' }, reward: { fr: 'Une carte de héros', en: 'A hero card' }, cardTitle: { fr: 'Le premier pas', en: 'The first step' }, world: 'nature' },
  { id: 'sharp_three', emoji: '🎯', metric: 'correct_streak', target: 3, title: { fr: 'Triplé gagnant', en: 'Winning hat trick' }, description: { fr: 'Réponds juste 3 fois de suite.', en: 'Answer right 3 times in a row.' }, reward: { fr: 'Une carte rare', en: 'A rare card' }, cardTitle: { fr: 'Le tir parfait', en: 'The perfect shot' }, world: 'sport' },
  { id: 'world_tourist', emoji: '🧭', metric: 'worlds_played', target: 3, title: { fr: 'Touriste des mondes', en: 'World tourist' }, description: { fr: 'Joue dans 3 mondes différents.', en: 'Play in 3 different worlds.' }, reward: { fr: 'Une carte voyageuse', en: 'A traveler card' }, cardTitle: { fr: 'Le carnet de voyage', en: 'The travel journal' }, world: 'espace' },
  { id: 'story_marathon', emoji: '📚', metric: 'chapters_done', target: 3, title: { fr: 'Marathon d’histoires', en: 'Story marathon' }, description: { fr: 'Termine 3 chapitres.', en: 'Finish 3 chapters.' }, reward: { fr: 'Une carte brillante', en: 'A shiny card' }, cardTitle: { fr: 'La grande bibliothèque', en: 'The great library' }, world: 'science' },
  { id: 'feed_fan', emoji: '💛', metric: 'likes', target: 5, title: { fr: 'Curieux de tout', en: 'Curious about everything' }, description: { fr: 'Aime 5 cartes dans Découvrir.', en: 'Like 5 cards in Discover.' }, reward: { fr: 'Une carte cœur', en: 'A heart card' }, cardTitle: { fr: 'Le coin des curieux', en: 'The curious corner' }, world: 'cuisine' },
  { id: 'puzzle_pro', emoji: '🧩', metric: 'puzzles_correct', target: 3, title: { fr: 'Pro des casse-têtes', en: 'Puzzle pro' }, description: { fr: 'Résous 3 casse-têtes de Découvrir.', en: 'Solve 3 puzzles in Discover.' }, reward: { fr: 'Une carte mystère', en: 'A mystery card' }, cardTitle: { fr: 'La clé du mystère', en: 'The mystery key' }, world: 'echecs' },
  { id: 'daily_hello', emoji: '☀️', metric: 'days_played', target: 2, title: { fr: 'Retour de flamme', en: 'Welcome back' }, description: { fr: 'Joue deux jours différents.', en: 'Play on two different days.' }, reward: { fr: 'Une carte soleil', en: 'A sun card' }, cardTitle: { fr: 'Le jour qui revient', en: 'The day that returns' }, world: 'medecine' },
];

/**
 * Definition of the gift card every child gets once, in the nature world. Selectors.welcomeCard builds the
 * earned card from it.
 */
export const WELCOME_CARD = { id: 'welcome', world: 'nature' as WorldId, title: { fr: 'Le cadeau de bienvenue', en: 'The welcome gift' } };

/**
 * Streak lengths in days that count as milestones (3, 7, 14). Nothing reads it yet, so changing it has no effect
 * until a celebration uses it.
 */
export const STREAK_MILESTONES = [3, 7, 14];
