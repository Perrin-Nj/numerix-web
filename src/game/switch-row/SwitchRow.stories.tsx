import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SwitchRow, type SwitchRowProps } from './SwitchRow';
import { Switch } from '@/ui/switch';

function Controlled({ initial = false, ...rest }: Omit<SwitchRowProps, 'checked' | 'onCheckedChange'> & { initial?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return <SwitchRow {...rest} checked={checked} onCheckedChange={setChecked} />;
}

const meta = {
  title: 'game/SwitchRow',
  component: SwitchRow,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Whole row tappable, switch beside its label, On/Off written, 48 px target. Sound: `toggle`.' } } }, // sounds-note
  args: { label: 'Échecs', checked: false, onCheckedChange: () => {} },
  render: (args) => <Controlled label={args.label} description={args.description} disabled={args.disabled} initial={args.checked} />,
} satisfies Meta<typeof SwitchRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const WithDescription: Story = { args: { checked: true, description: 'Lire les histoires à voix haute.' } };
export const Disabled: Story = { args: { checked: true, disabled: true } };

/** The world toggles of the parent settings, at phone and wide width. */
export const WorldToggles: Story = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {['Échecs', 'Médecine', 'Espace', 'Histoires africaines'].map((w, i) => (
        <Controlled key={w} label={w} initial={i < 3} />
      ))}
    </div>
  ),
};

/** Before (the old row: label left, switch pushed to the far edge) and after, side by side for review. */
export const BeforeAndAfter: Story = {
  render: () => (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="w-full max-w-3xl">
        <p className="mb-2 font-semibold text-muted">Avant</p>
        <Switch checked label="Médecine" onCheckedChange={() => {}} />
      </div>
      <div>
        <p className="mb-2 font-semibold text-muted">Après</p>
        <Controlled label="Médecine" initial />
      </div>
    </div>
  ),
};
