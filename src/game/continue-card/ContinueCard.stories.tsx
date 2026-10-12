import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ContinueCard } from './ContinueCard';

const meta = {
  title: 'game/ContinueCard',
  component: ContinueCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Sound: `maximize` on the primary press.' },
    },
  }, // sounds-note
  args: {
    label: 'Le partage des pommes',
    world: 'nature',
    hasOpenSession: false,
    onContinue: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContinueCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NewChapter: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onContinue).toHaveBeenCalled();
  },
};
export const OpenSession: Story = {
  args: { hasOpenSession: true, world: 'espace', label: 'La fusée en panne' },
};
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const TVScale: Story = { globals: { display: 'tv' } };
