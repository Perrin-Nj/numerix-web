import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { LessonProgress } from './LessonProgress';
import { Button } from '@/ui/button';

const meta = {
  title: 'game/LessonProgress',
  component: LessonProgress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Chapter bar. Fills with a soft spring when a question ends; instant under reduced motion. Never shows a number, a score or a timer. No sound.',
      },
    },
  }, // sounds-note
  args: { done: 2, total: 5 },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LessonProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  },
};
export const Empty: Story = { args: { done: 0 } };
export const Full: Story = { args: { done: 5 } };
export const Interactive: Story = {
  render: function Render(a) {
    const [n, setN] = useState(0);
    return (
      <div className="flex flex-col gap-3">
        <LessonProgress done={n} total={a.total} />
        <Button size="sm" onClick={() => setN((v) => (v + 1) % (a.total + 1))}>
          Next
        </Button>
      </div>
    );
  },
};
