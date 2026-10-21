import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StoryCard } from './StoryCard';
import { photosFor } from './card-photos';

const meta = {
  title: 'game/StoryCard',
  component: StoryCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Each card gets a unique look from its id and world (`cardStyleFor`). Pointer tilt with glare, tap or Enter/Space flips to the back. Rarity by source: chapter common, challenge rare, gift epic.',
      },
    },
  },
  args: {
    card: {
      id: '5f1c1b0e-0000-4000-8000-000000000001',
      world: 'nature',
      title: 'Le partage des pommes',
      image_url: '',
      earned_at: '2026-03-14T15:00:00Z',
    },
    onOpen: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StoryCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tile: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onOpen).toHaveBeenCalled();
  },
};
export const FlipWithKeyboard: Story = {
  args: { onOpen: undefined },
  play: async ({ canvasElement }) => {
    const b = within(canvasElement).getByRole('button');
    b.focus();
    await userEvent.keyboard('{Enter}');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard(' ');
    await expect(b).toHaveAttribute('aria-pressed', 'false');
  },
};
export const NotInteractive: Story = { args: { onOpen: undefined } };
export const Reveal: Story = { args: { variant: 'reveal', onOpen: undefined } };
export const Badge: Story = { args: { source: 'challenge' } };
export const BadgeDark: Story = { args: { source: 'challenge' }, globals: { theme: 'dark' } };
export const BadgeHighContrast: Story = { args: { source: 'challenge' }, globals: { theme: 'hc' } };
export const BadgeReducedMotion: Story = { args: { source: 'challenge' }, globals: { motion: 'reduced' } };
export const BadgeTV: Story = { args: { source: 'challenge' }, globals: { display: 'tv' } };
export const BadgeFrench: Story = { args: { source: 'challenge' }, globals: { locale: 'fr-CA' } };
export const BadgeEnglish: Story = { args: { source: 'challenge' }, globals: { locale: 'en-CA' } };
export const Gift: Story = { args: { source: 'gift' } };
export const GiftDark: Story = { args: { source: 'gift' }, globals: { theme: 'dark' } };
export const GiftHighContrast: Story = { args: { source: 'gift' }, globals: { theme: 'hc' } };
export const GiftReducedMotion: Story = { args: { source: 'gift' }, globals: { motion: 'reduced' } };
export const GiftTV: Story = { args: { source: 'gift' }, globals: { display: 'tv' } };
export const GiftFrench: Story = { args: { source: 'gift' }, globals: { locale: 'fr-CA' } };
export const GiftEnglish: Story = { args: { source: 'gift' }, globals: { locale: 'en-CA' } };
export const Espace: Story = {
  args: { card: { ...meta.args.card, id: 'espace-card', world: 'espace', title: 'La fusée en panne' } },
};
export const Cuisine: Story = {
  args: { card: { ...meta.args.card, id: 'cuisine-card', world: 'cuisine', title: 'La soupe de minuit' }, source: 'challenge' },
};
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { globals: { locale: 'en-CA' } };

const COLLECTION = [
  ['nature', 'Le premier pas'], ['nature', 'La clairière qui chantait'], ['nature', 'Le secret des graines endormies'], ['nature', 'Le chemin des feuilles'],
  ['nature', 'La mare aux grenouilles'], ['nature', 'Le partage des pommes'], ['espace', 'La fusée en panne'], ['espace', 'Une nuit de comètes'],
  ['cuisine', 'La soupe de minuit'], ['sport', 'Le grand match'], ['ocean', 'Les poissons du récif'], ['musique', 'Le tambour magique'],
] as const;
/** Twelve cards in one list: the regression test (scripts/check-card-collection.mjs) asserts unique photos and layouts. */
export const Collection: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="w-full max-w-none"><Story /></div>],
  render: () => {
    const cards = COLLECTION.map(([world, title], i) => ({ id: `5f1c1b0e-0000-4000-8000-0000000000${String(i + 10)}`, world, title, image_url: '', earned_at: `2026-03-${String(i + 10)}T15:00:00Z` }));
    const photos = photosFor(cards);
    return (
      <ul data-testid="collection" className="mx-auto grid w-[min(calc(100vw-2rem),56rem)] grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.id}>
            <StoryCard card={c} photo={photos.get(c.id)} />
          </li>
        ))}
      </ul>
    );
  },
};
