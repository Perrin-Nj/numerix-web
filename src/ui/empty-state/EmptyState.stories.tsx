import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EmptyState } from './EmptyState';
import { Button } from '@/ui/button';

const meta = {
  title: 'ui/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: { icon: 'book', title: 'Aucune histoire pour l’instant', description: 'Les histoires jouées apparaîtront ici.' },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = { args: { action: <Button>Jouer une histoire</Button> } };
export const Page: Story = { args: { size: 'page', icon: 'users', title: 'Aucun profil', action: <Button iconLeft={undefined}>Ajouter un enfant</Button> } };
