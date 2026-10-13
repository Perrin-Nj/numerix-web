import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IllustrationFrame } from './IllustrationFrame';
import { WORLD_IDS } from '@/data/api/types';

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
export const WithOverlay: Story = {
  args: {
    picture: <span className="text-6xl">🌱🌱🌱 ➕ 🌱🌱</span>,
    children: <span className="absolute right-2 top-2 rounded-full bg-elevated px-2 text-fg">5</span>,
  },
};
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
export const French: Story = { args: { alt: 'Une clairière dans la forêt' }, globals: { locale: 'fr-CA' } };
export const English: Story = { args: { alt: 'A forest clearing' }, globals: { locale: 'en-CA' } };
export const StageSwap: Story = {
  args: { stage: <span className="text-6xl">🌱🌱🌱</span>, stageKey: 'scene' },
  decorators: [(Story) => <div className="h-56"><Story /></div>],
};
