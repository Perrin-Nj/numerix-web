import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatTile } from './StatTile';

const meta = {
  title: 'ui/StatTile',
  component: StatTile,
  tags: ['autodocs'],
  decorators: [(Story) => <dl className="w-60"><Story /></dl>],
  args: { label: 'Chapitres terminés', value: 4, icon: 'book' },
} satisfies Meta<typeof StatTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Up: Story = { args: { compare: { current: 4, previous: 1, previousLabel: 'Avant : 1' } } };
export const Down: Story = { args: { compare: { current: 1, previous: 3, previousLabel: 'Avant : 3' } } };
export const Same: Story = { args: { compare: { current: 2, previous: 2, previousLabel: 'Avant : 2' } } };
export const Zero: Story = { args: { value: 0, compare: { current: 0, previous: 0, previousLabel: 'Avant : 0' } } };
export const NoIcon: Story = { args: { icon: undefined } };
