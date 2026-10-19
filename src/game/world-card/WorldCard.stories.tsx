import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WorldCard } from './WorldCard';
import { mockMedia } from '@/game/media-image';
import { WORLD_IDS, type World } from '@/data/api/types';

const COLORS = ['#2e8b57', '#4b3fa8', '#d9822b', '#3a7bd5', '#8b5a2b', '#0e9aa7', '#6a5acd', '#444b6e', '#1d7fb8', '#6b8e23', '#a0522d', '#8a2be2', '#d2691e', '#b8860b', '#c0392b', '#3b8ea5', '#5d6d7e', '#c2185b', '#4a90a4', '#7b4fa0'];
const world = (i: number, hero = true): World => ({
  id: WORLD_IDS[i],
  name: ['Nature', 'Espace', 'Cuisine', 'Sport', 'Construction', 'Médecine', 'Science', 'Échecs', 'Océan', 'Dinosaures'][i] ?? WORLD_IDS[i],
  tagline: 'Compte les étoiles et pars en voyage.',
  image_url: '',
  accent_color: COLORS[i],
  skill_count: 12,
  ...(hero ? { hero: mockMedia(COLORS[i], WORLD_IDS[i]) } : {}),
});

const meta = {
  title: 'game/WorldCard',
  component: WorldCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'World of the map: real photo with a gradient, progress ring, lock, parallax and tilt (off under reduced motion). Sound: `select`, `close` when locked.',
      },
    },
  }, // sounds-note
  args: { world: world(8), onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorldCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};
export const WithProgress: Story = { args: { progress: 0.4 } };
export const Mastered: Story = { args: { progress: 1 } };
export const Suggested: Story = { args: { suggested: true, progress: 0.15 } };
export const Locked: Story = { args: { locked: true } };
export const NoPhotoYet: Story = { args: { world: world(9, false) } };
export const Grid: Story = {
  render: () => (
    <div className="grid w-[640px] grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <WorldCard key={i} world={world(i, i !== 3)} progress={i === 1 ? 0.5 : null} locked={i === 5} onSelect={() => {}} />
      ))}
    </div>
  ),
};
