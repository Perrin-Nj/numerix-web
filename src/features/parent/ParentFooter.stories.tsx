import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { ParentFooter } from './ParentFooter';

const meta = {
  title: 'features/parent/ParentFooter',
  component: ParentFooter,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Credits link at the end of every parent page. No sound.' } } }, // sounds-note
} satisfies Meta<typeof ParentFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAttribute('href', '/credits');
  },
};
