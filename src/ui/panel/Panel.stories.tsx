import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Panel } from './Panel';

const meta = {
  title: 'ui/Panel',
  component: Panel,
  tags: ['autodocs'],
  args: { title: 'Cette semaine', children: <p className="text-muted">Trois jours de suite, bravo.</p> },
} satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Brand: Story = { args: { tone: 'brand' } };
export const Sunken: Story = { args: { tone: 'sunken' } };
export const NoTitle: Story = { args: { title: undefined } };
export const NotPadded: Story = { args: { padded: false } };
