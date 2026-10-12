import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ChoiceButton } from './ChoiceButton';
import type { AnswerValue } from '@/lib/api/types';

const meta = {
  title: 'game/ChoiceButton',
  component: ChoiceButton,
  tags: ['autodocs'],
  args: { value: 48, index: 0, state: 'idle', onSelect: fn() },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ChoiceButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onSelect).toHaveBeenCalledWith(48);
  },
};
export const Selected: Story = { args: { state: 'selected' } };
export const Locked: Story = { args: { state: 'locked' } };
export const Success: Story = { args: { state: 'success' } };
export const Remainder: Story = { args: { value: [48, 4], index: 2 } };
export const Text: Story = { args: { value: 'Quarante-huit', index: 1 } };

const VALUES: AnswerValue[] = [48, 54, [48, 4], 42];

function Group() {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {VALUES.map((v, i) => (
        <ChoiceButton
          key={i}
          value={v}
          index={i}
          shortcut
          state={picked === null ? 'idle' : picked === i ? 'selected' : 'locked'}
          onSelect={() => setPicked(i)}
        />
      ))}
    </div>
  );
}

export const FourChoices: Story = {
  render: () => <Group />,
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
};
export const TVScale: Story = {
  globals: { display: 'tv' },
  render: () => <Group />,
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
};
