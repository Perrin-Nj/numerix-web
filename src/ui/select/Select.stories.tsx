import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Select, type SelectProps } from './Select';

const OPTIONS = [
  { value: 'fr-CA', label: 'Français' },
  { value: 'en-CA', label: 'English' },
];

function Controlled(props: SelectProps) {
  const [value, setValue] = useState(props.value);
  return <Select {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'ui/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Sound: `select` when the list opens and when an option is chosen.',
      },
    },
  }, // sounds-note
  args: {
    label: 'Langue',
    options: OPTIONS,
    value: 'fr-CA',
    onValueChange: () => {},
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Placeholder: Story = {
  args: { value: '', placeholder: 'Choisis une langue' },
};
export const Disabled: Story = { args: { disabled: true } };
