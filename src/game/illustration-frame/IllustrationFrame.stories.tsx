import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IllustrationFrame } from './IllustrationFrame';
import { WORLD_IDS } from '@/lib/api/types';

const meta = {
  title: 'game/IllustrationFrame',
  component: IllustrationFrame,
  tags: ['autodocs'],
  args: { world: 'nature', alt: 'Une clairière dans la forêt' },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IllustrationFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { mood: 'success' } };
export const Detour: Story = { args: { mood: 'detour' } };
export const Surprise: Story = { args: { mood: 'surprise' } };
export const AllWorlds: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
      {WORLD_IDS.map((w) => (
        <IllustrationFrame key={w} world={w} alt={w} />
      ))}
    </div>
  ),
};
