import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IconButton } from './IconButton';
import { Icon } from '@/ui/icon';

const meta = {
  title: 'ui/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: { label: 'Réglages', icon: <Icon name="settings" /> },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Primary: Story = { args: { variant: 'primary', label: 'Jouer', icon: <Icon name="play" /> } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Supprimer', icon: <Icon name="trash" /> } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const Disabled: Story = { args: { disabled: true } };
