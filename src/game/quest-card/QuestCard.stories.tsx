import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { QuestCard } from './QuestCard';

const meta = {
  title: 'game/QuestCard',
  component: QuestCard,
  tags: ['autodocs'],
  args: { quest: { available: true, completed: false }, onPlay: fn() },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof QuestCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onPlay).toHaveBeenCalled();
  },
};
export const NotAvailable: Story = { args: { quest: { available: false, completed: false } } };
export const Completed: Story = { args: { quest: { available: true, completed: true } } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const TVScale: Story = { globals: { display: 'tv' } };
