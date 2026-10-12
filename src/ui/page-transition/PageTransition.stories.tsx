import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageTransition } from './PageTransition';

const Page = ({ name }: { name: string }) => (
  <div className="rounded-lg bg-brand-soft p-6 font-display text-xl text-fg">{name}</div>
);

const meta = {
  title: 'ui/PageTransition',
  component: PageTransition,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'No sound. Mounted around children in the play and parent layouts.' } },
    nextjs: { appDirectory: true, navigation: { pathname: '/play/home' } },
  },
  args: { children: <Page name="Accueil" /> },
} satisfies Meta<typeof PageTransition>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The wrapper is keyed by pathname, so each route renders a fresh transition. */
export const Default: Story = {};
export const OtherRoute: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/play/collection' },
    },
  },
  args: { children: <Page name="Collection" /> },
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
