import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './Avatar';

const IDS = ['fox', 'owl', 'bear', 'cat', 'panda', 'rabbit', 'lion', 'turtle'];

const meta = {
  title: 'ui/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { avatarId: 'fox', name: 'Léa', size: 'md' },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const UnknownIdFallsBackToInitial: Story = { args: { avatarId: 'dragon', name: 'Noé' } };
export const AllAnimals: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {IDS.map((id) => (
        <Avatar key={id} avatarId={id} name={id} size="lg" />
      ))}
    </div>
  ),
};
