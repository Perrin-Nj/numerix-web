import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OutcomeSheet } from './OutcomeSheet';

function Frame(args: ComponentProps<typeof OutcomeSheet>) {
  const [collapsed, setCollapsed] = useState(args.collapsed);
  return (
    <div className="h-[560px] bg-bg">
      <OutcomeSheet {...args} collapsed={collapsed} onCollapsedChange={setCollapsed} />
    </div>
  );
}

const meta = {
  title: 'game/OutcomeSheet',
  component: OutcomeSheet,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { right: true, line: 'Bien joué !', glow: 0, continueLabel: 'Continuer', canContinue: true, collapsed: false, onContinue: () => {}, onCollapsedChange: () => {} },
  render: (args) => <Frame {...args} />,
} satisfies Meta<typeof OutcomeSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {};
export const RightStreak: Story = { args: { glow: 3 } };
export const Wrong: Story = { args: { right: false, line: 'On y retourne ensemble.' } };
export const Collapsed: Story = { args: { collapsed: true } };
export const WaitingForText: Story = { args: { canContinue: false } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { globals: { locale: 'en-CA' } };
export const WrongWithExplanation: Story = {
  args: {
    right: false,
    line: 'Pas encore, on réfléchit ensemble.',
    detail: 'Presque ! Compte les deux plaques encore une fois.',
    explain: '8 + 7 = 8 + 2 + 5, donc 10 + 5.',
  },
};

/** Very long explanation on a phone: the text scrolls inside the sheet, Continue stays in view. */
export const LongExplanation: Story = {
  args: {
    right: false,
    line: 'Pas de souci, on repart sur un autre sentier.',
    detail: '3 tas de 10 font 30. Avec 4 feuilles seules : 30 + 4 = 34.',
    explain: 'Quand on additionne des dizaines et des unités, on garde les dizaines ensemble et on ajoute les unités à part, puis on regroupe le tout pour trouver le total. '.repeat(4),
  },
  globals: { viewport: { value: 'phone' } },
};
