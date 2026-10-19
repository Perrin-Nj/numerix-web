import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { WorldHero } from './WorldHero';
import { mockMedia } from '@/game/media-image';
import { MascotBubble } from '@/game/mascot-bubble';
import type { World } from '@/data/api/types';

const world: World = {
  id: 'ocean',
  name: 'Océan',
  tagline: 'Plonge parmi les poissons et compte les coraux.',
  image_url: '',
  accent_color: '#1d7fb8',
  skill_count: 14,
  hero: mockMedia('#1d7fb8', 'Ocean', 1440, 810),
};

const meta = {
  title: 'game/WorldHero',
  component: WorldHero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'World page header. Photo parallax on scroll and tilt, none under reduced motion. Falls back to the accent gradient. No sound.',
      },
    },
  }, // sounds-note
  args: { world },
} satisfies Meta<typeof WorldHero>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { name: 'Océan' })).toBeInTheDocument();
  },
};
export const WithGuide: Story = {
  args: { guide: <MascotBubble size="sm" pose="wave" className="mt-3">On y va ?</MascotBubble> },
};
export const NoPhotoYet: Story = { args: { world: { ...world, hero: undefined } } };
