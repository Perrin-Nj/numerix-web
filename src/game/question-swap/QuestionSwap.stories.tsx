import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { QuestionSwap } from './QuestionSwap';
import { Button } from '@/ui/button';

const meta = {
  title: 'game/QuestionSwap',
  component: QuestionSwap,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Enter and exit between questions: spring rise in, quick fade out. Fade only under reduced motion. No sound.',
      },
    },
  }, // sounds-note
  args: { id: '1', children: null },
} satisfies Meta<typeof QuestionSwap>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Swap: Story = {
  render: function Render() {
    const [n, setN] = useState(1);
    return (
      <div className="flex w-72 flex-col gap-3">
        <QuestionSwap id={String(n)}>
          <p className="rounded-lg bg-elevated p-4 font-display text-xl shadow-1">Question {n}</p>
        </QuestionSwap>
        <Button onClick={() => setN((v) => v + 1)}>Next question</Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Next question' }));
    await expect(await c.findByText('Question 2')).toBeInTheDocument();
  },
};
