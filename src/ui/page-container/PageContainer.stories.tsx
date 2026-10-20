import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageContainer } from './PageContainer';
import { MascotBubble } from '@/game/mascot-bubble';
import type { MascotConfig } from '@/game/mascot';

const on: MascotConfig = { enabled: true, kind: 'owl', src: '' };
const off: MascotConfig = { ...on, enabled: false };

const Sample = () => (
  <div className="rounded-lg bg-brand-soft p-6 text-fg">
    <h2 className="font-display text-2xl font-semibold">Bienvenue</h2>
    <p className="mt-2 text-muted">Le contenu reste centré, avec des marges qui s&apos;adaptent à l&apos;écran.</p>
  </div>
);

const meta = {
  title: 'ui/PageContainer',
  component: PageContainer,
  tags: ['autodocs'],
  args: { children: <Sample /> },
} satisfies Meta<typeof PageContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Narrow: Story = { args: { width: 'narrow' } };
export const Wide: Story = { args: { width: 'wide' } };
export const WithMascot: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4">
        <MascotBubble config={on}>Prêt pour une nouvelle histoire ?</MascotBubble>
        <Sample />
      </div>
    ),
  },
};
export const WithoutMascot: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4">
        <MascotBubble config={off}>Prêt pour une nouvelle histoire ?</MascotBubble>
        <Sample />
      </div>
    ),
  },
};
export const TvScale: Story = {
  args: { width: 'wide' },
  globals: { display: 'tv' },
};
