import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PinInput, type PinInputProps } from './PinInput';

function Controlled(props: PinInputProps) {
  const [value, setValue] = useState(props.value);
  return <PinInput {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'ui/PinInput',
  component: PinInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Sounds: keypad digits `tap`, `confirm` when the code is complete.',
      },
    },
  }, // sounds-note
  args: { label: 'Code secret', value: '', onChange: () => {} },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof PinInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PartlyFilled: Story = { args: { value: '12' } };
export const Complete: Story = { args: { value: '1234' } };
export const WithError: Story = {
  args: { value: '1234', error: 'Ce code n’est pas le bon.' },
};
export const NoKeypad: Story = { args: { keypad: false } };
export const SixDigits: Story = { args: { length: 6 } };
export const Disabled: Story = { args: { disabled: true, value: '12' } };
