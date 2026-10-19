import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { CreditsLink } from './CreditsLink';

const meta = {
  title: 'game/CreditsLink',
  component: CreditsLink,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Link to /credits for settings and footers. 44px tall target. No sound.' } },
  }, // sounds-note
} satisfies Meta<typeof CreditsLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAttribute('href', '/credits');
  },
};
