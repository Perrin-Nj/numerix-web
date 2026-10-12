import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './Input';

const meta = {
  title: 'ui/Input',
  component: Input,
  tags: ['autodocs'],
  args: { 'aria-label': 'Prénom', placeholder: 'Ton prénom' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Léa' } };
export const Invalid: Story = { args: { invalid: true, defaultValue: '12' } };
export const Disabled: Story = { args: { disabled: true } };
