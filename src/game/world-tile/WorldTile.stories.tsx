import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WorldTile } from './WorldTile';
import { WORLD_IDS, type World } from '@/data/api/types';

const NAMES = ['Nature', 'Espace', 'Cuisine', 'Sport', 'Construction', 'Médecine', 'Science', 'Échecs'];
const world = (i: number): World => ({
  id: WORLD_IDS[i],
  name: NAMES[i],
  tagline: '',
  image_url: 'https://example.com/w.png',
  accent_color: '#3fa34d',
  hook: '',
  skill_count: 12,
});

const meta = {
  title: 'game/WorldTile',
  component: WorldTile,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Sound: `select`. The photo zooms slightly on hover and focus.',
      },
    },
  }, // sounds-note
  args: { world: world(0), onSelect: fn() },
} satisfies Meta<typeof WorldTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};
export const Selected: Story = { args: { selected: true } };
export const Large: Story = { args: { size: 'lg' } };
export const AllWorlds: Story = {
  render: function Render() {
    const [sel, setSel] = useState('nature');
    return (
      <div className="flex flex-wrap gap-4">
        {WORLD_IDS.map((_, i) => (
          <WorldTile key={i} world={world(i)} selected={sel === WORLD_IDS[i]} onSelect={(w) => setSel(w.id)} />
        ))}
      </div>
    );
  },
};
export const TVScale: Story = { ...AllWorlds, globals: { display: 'tv' } };
