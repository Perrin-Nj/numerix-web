import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BottomNav } from './BottomNav';

const items = (active: string) => [
  {
    href: '/play/home',
    label: 'Accueil',
    icon: 'home' as const,
    active: active === 'home',
  },
  {
    href: '/play/worlds',
    label: 'Mondes',
    icon: 'map' as const,
    active: active === 'worlds',
  },
  {
    href: '/play/collection',
    label: 'Cartes',
    icon: 'star' as const,
    active: active === 'collection',
  },
  {
    href: '/play/me',
    label: 'Moi',
    icon: 'user' as const,
    active: active === 'me',
  },
];

const meta = {
  title: 'ui/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Sound: `switch` on navigation.' } } },
  args: { ariaLabel: 'Navigation principale', items: items('home') },
} satisfies Meta<typeof BottomNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SecondTab: Story = { args: { items: items('worlds') } };
