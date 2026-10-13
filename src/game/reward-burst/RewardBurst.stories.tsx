import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { RewardBurst } from './RewardBurst';

const card = {
  id: '5f1c1b0e-0000-4000-8000-000000000001',
  world: 'nature' as const,
  title: 'Le partage des pommes',
  image_url: '',
  earned_at: '2026-03-14T15:00:00Z',
};

const meta = {
  title: 'game/RewardBurst',
  component: RewardBurst,
  tags: ['autodocs'],
  args: { reward: { type: 'chapter_complete' }, onDone: fn() },
} satisfies Meta<typeof RewardBurst>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChapterComplete: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onDone).toHaveBeenCalled();
  },
};
export const CardEarned: Story = {
  args: { reward: { type: 'card_earned', card } },
};
export const StreakExtended: Story = {
  args: { reward: { type: 'streak_extended', streak_days: 5 } },
};
export const SkillMastered: Story = {
  args: { reward: { type: 'skill_mastered', skill_id: 'ARI-OPE-A07a' } },
};
export const DailyGoalMet: Story = {
  args: { reward: { type: 'daily_goal_met' } },
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const Dark: Story = { globals: { theme: 'dark' }, args: { reward: { type: 'skill_mastered', skill_id: 'ARI-OPE-A07a' } } };
export const HighContrast: Story = { globals: { theme: 'hc' }, args: { reward: { type: 'streak_extended', streak_days: 3 } } };
export const French: Story = { globals: { locale: 'fr-CA' }, args: { reward: { type: 'card_earned', card } } };
export const English: Story = { globals: { locale: 'en-CA' }, args: { reward: { type: 'card_earned', card } } };
export const CardEarnedBadge: Story = { args: { reward: { type: 'card_earned', card: { ...card, id: 'ch-first_steps' } } } };
export const CardEarnedGift: Story = { args: { reward: { type: 'card_earned', card: { ...card, id: 'welcome' } } } };
