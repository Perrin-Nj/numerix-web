import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OutcomeBeat } from './OutcomeBeat';
import { NarrationText } from '@/game/narration-text';

const meta = {
  title: 'game/OutcomeBeat',
  component: OutcomeBeat,
  tags: ['autodocs'],
  args: {
    outcome: 'correct',
    label: 'Bien joué',
    children: (
      <NarrationText text="Les quatre écureuils reçoivent douze pommes chacun et applaudissent Zoé." status="ready" />
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OutcomeBeat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Correct: Story = {};
export const TypicalError: Story = {
  args: {
    outcome: 'erreur_typique',
    children: (
      <NarrationText
        text="Un vieux hibou propose une autre façon de partager. Zoé le suit sur un nouveau sentier."
        status="ready"
      />
    ),
  },
};
export const RandomError: Story = {
  args: {
    outcome: 'erreur_aleatoire',
    children: (
      <NarrationText text="Un vent léger fait tourbillonner les feuilles et relance la scène." status="ready" />
    ),
  },
};
export const Streaming: Story = {
  args: {
    children: <NarrationText text="Les quatre écureuils" status="streaming" />,
  },
};
export const AllThree: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['correct', 'erreur_typique', 'erreur_aleatoire'] as const).map((o) => (
        <OutcomeBeat key={o} outcome={o}>
          <NarrationText text="Même poids visuel pour chaque issue." status="ready" />
        </OutcomeBeat>
      ))}
    </div>
  ),
};
export const VariedLabel: Story = { args: { label: undefined } };
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const English: Story = { args: { label: undefined }, globals: { locale: 'en-CA' } };
