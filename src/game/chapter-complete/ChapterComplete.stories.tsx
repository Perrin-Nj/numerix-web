import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChapterComplete } from './ChapterComplete';

const card = {
  id: '5f1c1b0e-0000-4000-8000-000000000001',
  world: 'nature' as const,
  title: 'Le partage des pommes',
  image_url: '',
  earned_at: '2026-03-14T15:00:00Z',
};

const meta = {
  title: 'game/ChapterComplete',
  component: ChapterComplete,
  tags: ['autodocs'],
  args: {
    title: 'Le partage des pommes',
    rewards: [],
    streakDays: 4,
    onNext: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ChapterComplete>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NoRewards: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getAllByRole('button')[0]);
    await expect(args.onNext).toHaveBeenCalled();
  },
};
export const WithoutStreak: Story = {
  args: { streakDays: undefined, title: undefined },
};
export const AllRewards: Story = {
  args: {
    rewards: [
      { type: 'chapter_complete' },
      { type: 'card_earned', card },
      { type: 'streak_extended', streak_days: 4 },
      { type: 'skill_mastered', skill_id: 'ARI-OPE-A07a' },
      { type: 'daily_goal_met' },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (let i = 0; i < 5; i++) await userEvent.click(await c.findByRole('button', { name: /continu|continue/i }));
    await expect(await c.findByRole('heading', { level: 1 })).toBeInTheDocument();
  },
};
export const ReducedMotion: Story = {
  args: { rewards: [{ type: 'chapter_complete' }] },
  globals: { motion: 'reduced' },
};
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const TVScale: Story = { globals: { display: 'tv' } };
