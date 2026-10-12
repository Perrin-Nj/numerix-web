import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';
import { Icon } from '@/ui/icon';

const meta = {
  title: 'ui/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Jouer' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Supprimer' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = { args: { iconLeft: <Icon name="play" /> } };
export const ExtraLarge: Story = { args: { size: 'xl' } };
export const FullWidth: Story = { args: { fullWidth: true } };
