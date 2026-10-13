import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GuidedTour, type GuidedTourStep } from './GuidedTour';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Mascot, type MascotConfig } from '@/game/mascot';

const steps: GuidedTourStep[] = [
  {
    title: 'Bienvenue',
    description: 'On te montre où tout se trouve en trois étapes.',
  },
  {
    target: '#tour-worlds',
    title: 'Choisis un monde',
    description: 'Touche une tuile pour partir à l’aventure.',
  },
  {
    target: '#tour-streak',
    title: 'Ta série',
    description: 'Reviens chaque jour pour la faire grandir.',
  },
  {
    target: '#tour-play',
    title: 'Prêt ?',
    description: 'Appuie sur Jouer pour lire une histoire.',
  },
];

function Screen({ mascot, open, onOpen }: { mascot: MascotConfig; open: boolean; onOpen: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <div className="flex items-center gap-3">
        <Mascot config={mascot} size="sm" />
        <span
          id="tour-streak"
          className="inline-flex items-center gap-2 rounded-md bg-brand-soft px-3 py-2 font-display text-fg"
        >
          <Icon name="flame" /> 5
        </span>
        <Button variant="secondary" onClick={onOpen} disabled={open}>
          Revoir la visite
        </Button>
      </div>
      <ul id="tour-worlds" className="grid grid-cols-2 gap-3">
        {['🌿 Nature', '🚀 Espace', '🍳 Cuisine', '⚽ Sport'].map((w) => (
          <li key={w} className="rounded-lg bg-world-nature p-6 text-center font-display text-lg text-brand-fg">
            {w}
          </li>
        ))}
      </ul>
      <Button id="tour-play" size="lg" iconLeft={<Icon name="play" />}>
        Jouer
      </Button>
    </div>
  );
}

function Demo({ mascot, startOpen }: { mascot: MascotConfig; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Screen mascot={mascot} open={open} onOpen={() => setOpen(true)} />
      <GuidedTour steps={steps} open={open} onClose={() => setOpen(false)} onFinish={() => setOpen(false)} />
    </>
  );
}

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const off: MascotConfig = { ...on, enabled: false };

const meta = {
  title: 'ui/GuidedTour',
  component: GuidedTour,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Sounds: `switch` on next, `back` on back.' },
    },
  }, // sounds-note
  args: { steps, open: true, onClose: () => {}, onFinish: () => {} },
  render: () => <Demo mascot={on} startOpen />,
} satisfies Meta<typeof GuidedTour>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Closed: Story = {
  render: () => <Demo mascot={on} startOpen={false} />,
};
export const WithoutMascot: Story = {
  render: () => <Demo mascot={off} startOpen />,
};
export const CenteredStepsOnly: Story = {
  render: () => {
    const Only = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Revoir la visite</Button>
          <GuidedTour
            steps={steps.slice(0, 1)}
            open={open}
            onClose={() => setOpen(false)}
            onFinish={() => setOpen(false)}
          />
        </>
      );
    };
    return <Only />;
  },
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
