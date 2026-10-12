import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OutcomeSim } from './OutcomeSim';
import { WORLD_IDS } from '@/lib/api/types';

const meta = {
  title: 'game/OutcomeSim',
  component: OutcomeSim,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Plays a sound per world and outcome (see SIM_SOUND). 3 s at most, tap to skip. Reduced motion shows the finished picture. Captions explain the risk and encourage, never blame.',
      },
    },
  },
  args: { world: 'construction', good: true },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OutcomeSim>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConstructionGood: Story = {};
export const ConstructionBad: Story = { args: { good: false } };
export const NatureGood: Story = { args: { world: 'nature' } };
export const NatureBad: Story = { args: { world: 'nature', good: false } };
export const EspaceGood: Story = { args: { world: 'espace' } };
export const EspaceBad: Story = { args: { world: 'espace', good: false } };
export const CuisineGood: Story = { args: { world: 'cuisine' } };
export const CuisineBad: Story = { args: { world: 'cuisine', good: false } };
export const SportGood: Story = { args: { world: 'sport' } };
export const SportBad: Story = { args: { world: 'sport', good: false } };
export const MedecineGood: Story = { args: { world: 'medecine' } };
export const MedecineBad: Story = { args: { world: 'medecine', good: false } };
export const ScienceGood: Story = { args: { world: 'science' } };
export const ScienceBad: Story = { args: { world: 'science', good: false } };
export const EchecsGood: Story = { args: { world: 'echecs' } };
export const EchecsBad: Story = { args: { world: 'echecs', good: false } };
export const Still: Story = { args: { playing: false } };
export const SecondCaption: Story = { args: { variant: 1 } };

const all = (good: boolean) =>
  function Render() {
    return (
      <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
        {WORLD_IDS.map((w) => (
          <OutcomeSim key={w} world={w} good={good} playing={false} />
        ))}
      </div>
    );
  };
export const AllGood: Story = { render: all(true) };
export const AllBad: Story = { render: all(false) };
export const Dark: Story = { render: all(false), globals: { theme: 'dark' } };
export const HighContrast: Story = { render: all(true), globals: { theme: 'hc' } };
export const ReducedMotion: Story = { args: { good: false }, globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { args: { world: 'medecine', good: false }, globals: { locale: 'fr-CA' } };
export const English: Story = { args: { world: 'medecine', good: false }, globals: { locale: 'en-CA' } };
