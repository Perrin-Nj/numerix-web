import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SettingsGrid } from './SettingsGrid';
import { SwitchRow } from '@/game/switch-row';
import { ChoiceChips } from '@/ui/choice-chips';
import { Panel } from '@/ui/panel';

function Cards() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [c, setC] = useState(true);
  const [vol, setVol] = useState(0.2);
  return (
    <SettingsGrid>
      <SwitchRow label="Musique douce" description="Une petite musique calme pendant les histoires." checked={a} onCheckedChange={setA} />
      <ChoiceChips label="Volume de la musique" value={vol} options={[{ value: 0.2, label: 'Doux' }, { value: 0.35, label: 'Moyen' }]} onChange={setVol} />
      <SwitchRow label="Petite vibration" description="Le téléphone vibre quand tu réponds." checked={b} onCheckedChange={setB} />
      <SwitchRow label="Voix de Numa" description="Numa lit les questions à voix haute." checked={c} onCheckedChange={setC} />
      <SwitchRow label="Petits coups de pouce" description="Numa te donne un indice si tu hésites." checked={a} onCheckedChange={setA} />
    </SettingsGrid>
  );
}

const meta = {
  title: 'ui/SettingsGrid',
  component: SettingsGrid,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'One column on narrow containers, two equal columns from 42 rem, a lone last card spans the row. Follows the container width, not the screen.' } } },
  args: { children: null },
  render: () => <Cards />,
} satisfies Meta<typeof SettingsGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

const at = (px: number): Story => ({
  render: () => (
    <div style={{ width: px, maxWidth: '100%' }}>
      <Panel title="Voix et aide">
        <Cards />
      </Panel>
    </div>
  ),
});

export const Width320 = at(320);
export const Width390 = at(390);
export const Width672 = at(672);
export const Width896 = at(896);
export const Width1280 = at(1280);
export const Width2560 = at(2560);
