import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Chip } from './Chip';

const meta = {
  title: 'ui/Chip',
  component: Chip,
  tags: ['autodocs'],
  args: { children: 'Autorisation donnée' },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { icon: 'lock', children: 'Code requis' } };
export const Success: Story = { args: { tone: 'success', icon: 'check' } };
export const Warning: Story = { args: { tone: 'warning', icon: 'alert', children: 'Autorisation requise' } };
export const Info: Story = { args: { tone: 'info', icon: 'info', children: 'Nouveau' } };
export const Brand: Story = { args: { tone: 'brand', icon: 'star', children: 'Année 2' } };
