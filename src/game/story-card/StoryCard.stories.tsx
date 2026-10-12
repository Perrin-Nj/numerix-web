import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { StoryCard } from './StoryCard';

const meta = {
  title: 'game/StoryCard',
  component: StoryCard,
  tags: ['autodocs'],
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
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof StoryCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tile: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onOpen).toHaveBeenCalled();
  },
};
export const NotInteractive: Story = { args: { onOpen: undefined } };
export const Reveal: Story = { args: { variant: 'reveal', onOpen: undefined } };
export const Espace: Story = { args: { card: { ...meta.args.card, world: 'espace', title: 'La fusée en panne' } } };
export const TVScale: Story = { globals: { display: 'tv' } };
