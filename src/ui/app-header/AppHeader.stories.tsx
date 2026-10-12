import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AppHeader } from './AppHeader';
import { IconButton } from '@/ui/icon-button';
import { Icon } from '@/ui/icon';
import { Mascot, type MascotConfig } from '@/game/mascot';

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const off: MascotConfig = { ...on, enabled: false };

const meta = {
  title: 'ui/AppHeader',
  component: AppHeader,
  tags: ['autodocs'],
  args: { title: 'Mon parcours' },
  decorators: [
    (Story) => (
      <div className="h-[28rem] overflow-y-auto rounded-md border-2 border-line">
        <Story />
        <div className="space-y-3 p-4">
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} className="rounded-md bg-sunken p-4 text-muted">
              Ligne {i + 1}, fais défiler pour voir l&apos;en-tête rester en place.
            </p>
          ))}
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AppHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithBackAndSettings: Story = {
  args: {
    left: <IconButton label="Retour" icon={<Icon name="chevron-left" />} />,
    right: <IconButton label="Réglages" icon={<Icon name="settings" />} />,
  },
};
export const WithMascot: Story = { args: { left: <Mascot size="sm" pose="greet" config={on} /> } };
export const WithoutMascot: Story = { args: { left: <Mascot size="sm" pose="greet" config={off} /> } };
export const LongTitle: Story = {
  args: { title: 'Un titre vraiment très long qui doit se couper proprement sur un petit écran de téléphone' },
};
export const TvScale: Story = { globals: { display: 'tv' } };
