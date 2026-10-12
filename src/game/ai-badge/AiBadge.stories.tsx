import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AiBadge } from './AiBadge';

const meta = {
  title: 'game/AiBadge',
  component: AiBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof AiBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OnWorldColor: Story = {
  decorators: [
    (Story) => (
      <div className="bg-world-espace p-6">
        <Story />
      </div>
    ),
  ],
};
export const TVScale: Story = { globals: { display: 'tv' } };
