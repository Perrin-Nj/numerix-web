import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs } from './Tabs';

const meta = {
  title: 'ui/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Sound: `switch` on tab change.' } },
  }, // sounds-note
  args: {
    ariaLabel: 'Sections',
    items: [
      {
        value: 'week',
        label: 'Semaine',
        content: <p>Trois jours de jeu cette semaine.</p>,
      },
      {
        value: 'month',
        label: 'Mois',
        content: <p>Douze jours de jeu ce mois-ci.</p>,
      },
      {
        value: 'all',
        label: 'Tout',
        content: <p>Une belle série depuis le début.</p>,
      },
    ],
  },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const StartsOnSecond: Story = { args: { defaultValue: 'month' } };
