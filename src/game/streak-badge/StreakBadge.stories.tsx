import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StreakBadge } from './StreakBadge';

const meta = {
  title: 'game/StreakBadge',
  component: StreakBadge,
  tags: ['autodocs'],
  args: { days: 5 },
} satisfies Meta<typeof StreakBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OneDay: Story = { args: { days: 1 } };
export const LongStreak: Story = { args: { days: 128 } };
export const FreshStart: Story = { args: { days: 0 } };
export const TVScale: Story = { globals: { display: 'tv' } };
