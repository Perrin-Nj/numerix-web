import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pulse } from './Pulse';
import { Button } from '@/ui/button';

const meta = {
  title: 'ui/Pulse',
  component: Pulse,
  tags: ['autodocs'],
  args: { children: <Button>Jouer</Button> },
} satisfies Meta<typeof Pulse>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Inactive: Story = { args: { active: false } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
