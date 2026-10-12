import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WorldTeaser } from './WorldTeaser';

const meta = {
  title: 'game/WorldTeaser',
  component: WorldTeaser,
  tags: ['autodocs'],
  args: {
    onOpen: fn(),
    world: {
      id: 'espace',
      name: 'Espace',
      tagline: 'Voyage parmi les étoiles',
      image_url: 'https://example.com/espace.png',
      accent_color: '#5b5bd6',
      hook: 'Une fusée a perdu ses boutons. Peux-tu l\'aider ?',
      skill_count: 14,
    },
  },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof WorldTeaser>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onOpen).toHaveBeenCalled();
  },
};
export const WithoutHook: Story = {
  args: {
    world: { id: 'cuisine', name: 'Cuisine', tagline: '', image_url: 'https://example.com/c.png', accent_color: '#f07e2b', skill_count: 9 },
  },
};
export const TVScale: Story = { globals: { display: 'tv' } };
