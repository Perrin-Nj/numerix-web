import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from './FormField';
import { Input } from '@/ui/input';

const meta = {
  title: 'ui/FormField',
  component: FormField,
  tags: ['autodocs'],
  args: {
    label: 'Prénom',
    htmlFor: 'ff-name',
    children: <Input id="ff-name" aria-describedby="ff-name-hint ff-name-error" />,
  },
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = {
  args: { hint: 'Comme sur ta carte de joueur.' },
};
export const Required: Story = { args: { required: true } };
export const WithError: Story = {
  args: {
    error: 'Écris au moins une lettre.',
    children: <Input id="ff-name" invalid aria-describedby="ff-name-hint ff-name-error" />,
  },
};
