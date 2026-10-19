import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { MediaImage } from './MediaImage';
import { mockMedia } from './mock';

const meta = {
  title: 'game/MediaImage',
  component: MediaImage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Server image with dominant colour, blurred LQIP preview and srcset. Fades in when loaded; falls back to the colour and preview when the file fails. No sound.',
      },
    },
  }, // sounds-note
  args: { media: mockMedia('#4aa3df', 'Ocean') },
  decorators: [
    (Story) => (
      <div className="h-56 w-96 overflow-hidden rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaImage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Ocean' })).toBeInTheDocument();
  },
};
export const Contain: Story = { args: { fit: 'contain' } };
export const Decorative: Story = { args: { alt: '' } };
export const BrokenFile: Story = {
  args: { media: { ...mockMedia('#e0a458', 'Broken'), srcset: [{ w: 480, url: '/assets/a_missing00000000000000.webp' }] } },
};
