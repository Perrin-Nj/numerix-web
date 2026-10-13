import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pop } from './Pop';
import { Icon } from '@/ui/icon';

const Badge = () => (
  <span className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-display text-brand-fg">
    <Icon name="star" /> 12
  </span>
);

const meta = {
  title: 'ui/Pop',
  component: Pop,
  tags: ['autodocs'],
  args: { children: <Badge /> },
} satisfies Meta<typeof Pop>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Emoji: Story = {
  args: { children: <span className="text-6xl">🎉</span> },
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
