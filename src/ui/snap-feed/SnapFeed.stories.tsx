import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SnapFeed } from './SnapFeed';
import { Button } from '@/ui/button';
import { Mascot, type MascotConfig } from '@/game/mascot';

const on: MascotConfig = { enabled: true, kind: 'owl', src: '' };
const off: MascotConfig = { ...on, enabled: false };

const worlds = [
  {
    id: 'nature',
    emoji: '🌿',
    name: 'Nature',
    hook: 'Combien de feuilles dans la forêt ?',
    bg: 'bg-world-nature',
  },
  {
    id: 'espace',
    emoji: '🚀',
    name: 'Espace',
    hook: 'Un voyage jusqu’à la Lune.',
    bg: 'bg-world-espace',
  },
  {
    id: 'cuisine',
    emoji: '🍳',
    name: 'Cuisine',
    hook: 'Partager la tarte en parts égales.',
    bg: 'bg-world-cuisine',
  },
  {
    id: 'sport',
    emoji: '⚽',
    name: 'Sport',
    hook: 'Qui marquera le plus de buts ?',
    bg: 'bg-world-sport',
  },
  {
    id: 'science',
    emoji: '🔬',
    name: 'Science',
    hook: 'Mesurer des choses minuscules.',
    bg: 'bg-world-science',
  },
];

function cards(mascot: MascotConfig) {
  return worlds.map((w) => (
    <article key={w.id} className={`flex min-h-72 flex-col justify-between rounded-lg p-6 text-brand-fg ${w.bg}`}>
      <div className="flex items-start justify-between">
        <span className="text-6xl" aria-hidden>
          {w.emoji}
        </span>
        <Mascot config={mascot} size="sm" />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-2xl font-semibold">{w.name}</h3>
        <p>{w.hook}</p>
        <Button variant="secondary" className="self-start">
          Explorer
        </Button>
      </div>
    </article>
  ));
}

const meta = {
  title: 'ui/SnapFeed',
  component: SnapFeed,
  tags: ['autodocs'],
  args: {
    ariaLabel: 'Fil d’accueil',
    className: 'h-[32rem]',
    children: cards(on),
  },
} satisfies Meta<typeof SnapFeed>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByRole('listitem');
    items[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(items[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(items[0]).toHaveFocus();
  },
};
export const WithoutMascot: Story = { args: { children: cards(off) } };
export const SingleCard: Story = {
  args: {
    children: <article className="rounded-lg bg-brand-soft p-6 text-fg">Une seule carte</article>,
  },
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = {
  args: { className: 'h-[48rem]' },
  globals: { display: 'tv' },
};
