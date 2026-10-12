import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Switch, type SwitchProps } from './Switch';

function Controlled(
  props: Omit<SwitchProps, 'checked' | 'onCheckedChange'> & {
    initial?: boolean;
  },
) {
  const { initial = false, ...rest } = props;
  const [checked, setChecked] = useState(initial);
  return <Switch {...rest} checked={checked} onCheckedChange={setChecked} />;
}

const meta = {
  title: 'ui/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Sound: `toggle` on change.' } },
  }, // sounds-note
  args: { label: 'Sons', checked: false, onCheckedChange: () => {} },
  render: (args) => (
    <Controlled label={args.label} description={args.description} disabled={args.disabled} initial={args.checked} />
  ),
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const WithDescription: Story = {
  args: { description: 'Un petit bruit à chaque bonne nouvelle.' },
};
export const Disabled: Story = { args: { disabled: true } };
