import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InlineError } from './InlineError';

const meta = {
  title: 'ui/InlineError',
  component: InlineError,
  tags: ['autodocs'],
  args: { message: 'Le code ne correspond pas.' },
} satisfies Meta<typeof InlineError>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithRecovery: Story = {
  args: { recovery: 'Vérifie les quatre chiffres et réessaie.' },
};
