import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ChoiceChips } from './ChoiceChips';

function Demo({ width }: { width: number }) {
  const [v, setV] = useState(30);
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <ChoiceChips label="Indice après" value={v} options={[15, 30, 45].map((n) => ({ value: n, label: `${n} s` }))} onChange={setV} />
    </div>
  );
}

const meta = { title: 'ui/ChoiceChips', component: ChoiceChips, tags: ['autodocs'], args: { label: 'Indice après', value: 30, options: [], onChange: () => {} }, render: () => <Demo width={360} /> } satisfies Meta<typeof ChoiceChips>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Narrow: Story = {};
export const Medium: Story = { render: () => <Demo width={560} /> };
export const Wide: Story = { render: () => <Demo width={900} /> };
