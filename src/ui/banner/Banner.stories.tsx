import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Banner } from './Banner';

const meta = {
  title: 'ui/Banner',
  component: Banner,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Sound: `minimize` on dismiss.' } },
  }, // sounds-note
  args: {
    title: 'Tu es hors ligne',
    description: 'Tes progrès seront envoyés dès le retour du réseau.',
  },
} satisfies Meta<typeof Banner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = {
  args: {
    tone: 'success',
    title: 'Connexion rétablie',
    description: undefined,
  },
};
export const Warning: Story = {
  args: { tone: 'warning', title: 'Ta session expire bientôt' },
};
export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Session terminée',
    description: 'Reconnecte-toi pour continuer.',
    action: { label: 'Se reconnecter', onClick: fn() },
  },
};
export const Dismissible: Story = { args: { onDismiss: fn() } };
