import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from './Progress';

const meta = {
  title: 'ui/Progress',
  component: Progress,
  tags: ['autodocs'],
  args: { value: 3, max: 5, label: 'Objectif de la semaine' },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 5 } };
