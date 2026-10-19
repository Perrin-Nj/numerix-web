import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';
import { Icon } from '@/ui/icon';

const meta = {
  title: 'ui/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Plays `tap` on click. `sound` prop: another sound name, or null for silence. Primary has a hover/focus shine sweep.',
      },
    },
  }, // sounds-note
  args: { children: 'Jouer' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = {
  args: { variant: 'danger', children: 'Supprimer' },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = { args: { iconLeft: <Icon name="play" /> } };
export const ExtraLarge: Story = { args: { size: 'xl' } };
export const FullWidth: Story = { args: { fullWidth: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <Button>Jouer</Button>
      <Button variant="secondary">Retour</Button>
      <Button variant="ghost">Plus tard</Button>
      <Button variant="danger">Supprimer</Button>
    </div>
  ),
};
