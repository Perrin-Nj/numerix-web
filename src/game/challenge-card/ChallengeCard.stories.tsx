import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChallengeCard } from './ChallengeCard';

const meta = {
  title: 'game/ChallengeCard',
  component: ChallengeCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Sound: `tap` on accept, `card_earned` on claim. Done state plays a trophy pop once and glows.' },
    },
  }, // sounds-note
  args: {
    id: 'c1',
    title: 'Trois histoires cette semaine',
    description: 'Vis trois histoires, à ton rythme.',
    target: 3,
    progress: 0,
    status: 'available',
    rewardLabel: 'Une carte rare',
    emoji: '📚',
    onAccept: fn(),
    onClaim: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChallengeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onAccept).toHaveBeenCalledWith('c1');
  },
};
export const Active: Story = { args: { status: 'active', progress: 2 } };
export const Done: Story = {
  args: { status: 'done', progress: 3 },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClaim).toHaveBeenCalledWith('c1');
  },
};
const all: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <ChallengeCard {...args} status="available" progress={0} />
      <ChallengeCard {...args} status="active" progress={2} />
      <ChallengeCard {...args} status="done" progress={3} />
    </div>
  ),
};
export const AllStates: Story = all;
export const Dark: Story = { ...all, globals: { theme: 'dark' } };
export const HighContrast: Story = { ...all, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { ...all, globals: { motion: 'reduced' } };
export const TVScale: Story = { ...all, globals: { display: 'tv' } };
export const French: Story = { ...all, globals: { locale: 'fr-CA' } };
export const English: Story = {
  ...all,
  args: { title: 'Three stories this week', description: 'Live three stories, at your own pace.', rewardLabel: 'A rare card' },
  globals: { locale: 'en-CA' },
};
