import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { FeedItem } from '@/lib/api/types';
import { FeedCard, type FeedAnswerResult } from './FeedCard';

const answerWith = (outcome: FeedAnswerResult['outcome'], message: string) =>
  fn(async (): Promise<FeedAnswerResult> => ({ outcome, message }));

const base: FeedItem = {
  id: 'feed-1',
  kind: 'story_short',
  world: 'nature',
  title: 'Le renard et les noisettes',
  text: 'Un petit renard partage ses noisettes avec ses amis, une par une, jusqu’au coucher du soleil.',
  ai_generated: true,
  generated_by: 'mock',
  liked: false,
  saved: false,
  cta: { label: 'Vivre cette histoire', world: 'nature' },
};

const puzzle: FeedItem = {
  ...base,
  id: 'feed-3',
  kind: 'puzzle',
  title: 'Les fusées de Mia',
  text: 'Mia range ses fusées en rangées égales.',
  world: 'espace',
  puzzle: { math_text: '12 ÷ 4 = ?', choices: [3, 4, 6, 8] },
  cta: { label: 'Continuer dans l’espace', world: 'espace' },
};

const meta = {
  title: 'game/FeedCard',
  component: FeedCard,
  tags: ['autodocs'],
  args: {
    item: base,
    active: true,
    onReact: fn(),
    onCta: fn(),
    onAnswer: answerWith('correct', 'Les fusées se rangent parfaitement et Mia sourit.'),
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeedCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const StoryShort: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /Vivre/ }));
    await expect(args.onCta).toHaveBeenCalled();
  },
};
export const FunFact: Story = {
  args: {
    item: {
      ...base,
      id: 'feed-2',
      kind: 'fun_fact',
      title: 'Les abeilles comptent',
      text: 'Les abeilles savent compter jusqu’à quatre.',
      cta: null,
    },
  },
};
export const Puzzle: Story = { args: { item: puzzle } };
export const PuzzleCorrect: Story = {
  args: { item: puzzle },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole('button')[0]);
    await expect(await within(canvasElement).findByText(/Mia sourit/)).toBeInTheDocument();
  },
};
export const PuzzleTypicalError: Story = {
  args: {
    item: puzzle,
    onAnswer: answerWith('erreur_typique', 'Un détour surprise : les fusées prennent un autre chemin.'),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole('button')[1]);
    await expect(await within(canvasElement).findByText(/détour/)).toBeInTheDocument();
  },
};
export const PuzzleRandomError: Story = {
  args: {
    item: puzzle,
    onAnswer: answerWith('erreur_aleatoire', 'Un vent léger relance la scène.'),
  },
};
export const Challenge: Story = {
  args: {
    item: {
      ...base,
      id: 'feed-4',
      kind: 'challenge',
      world: 'sport',
      title: 'Défi du jour',
      text: 'Prêt pour un chapitre de sport ?',
      cta: { label: 'Relever le défi', world: 'sport' },
    },
  },
};
export const LikedAndSaved: Story = {
  args: { item: { ...base, liked: true, saved: true } },
};
export const TVScale: Story = { globals: { display: 'tv' } };
