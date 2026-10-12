import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DailyGoalRing } from './DailyGoalRing';
import { Button } from '@/ui/button';

const meta = {
  title: 'game/DailyGoalRing',
  component: DailyGoalRing,
  tags: ['autodocs'],
  args: { done: 1, target: 3 },
} satisfies Meta<typeof DailyGoalRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { done: 0 } };
export const Met: Story = { args: { done: 3 } };
export const Interactive: Story = {
  render: function Render() {
    const [done, setDone] = useState(0);
    return (
      <div className="flex items-center gap-6">
        <DailyGoalRing done={done} target={3} />
        <Button onClick={() => setDone((d) => (d >= 3 ? 0 : d + 1))}>+1</Button>
      </div>
    );
  },
};
export const TVScale: Story = { args: { done: 2 }, globals: { display: 'tv' } };
