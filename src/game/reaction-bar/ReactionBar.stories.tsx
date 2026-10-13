import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ReactionBar, type ReactionState } from './ReactionBar';

const meta = {
  title: 'game/ReactionBar',
  component: ReactionBar,
  tags: ['autodocs'],
  args: { liked: false, saved: false, onChange: () => {} },
} satisfies Meta<typeof ReactionBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Liked: Story = { args: { liked: true } };
export const Saved: Story = { args: { saved: true } };
export const Both: Story = { args: { liked: true, saved: true } };
export const Disabled: Story = { args: { disabled: true } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };

export const Interactive: Story = {
  render: (args) => {
    const [s, set] = useState<ReactionState>({ liked: false, saved: false });
    return <ReactionBar {...args} {...s} onChange={set} />;
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const like = c.getAllByRole('button')[0];
    await userEvent.click(like);
    await expect(like).toHaveAttribute('aria-pressed', 'true');
  },
};
