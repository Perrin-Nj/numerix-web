import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MascotBubble } from './MascotBubble';
import type { MascotConfig, MascotPose } from '@/game/mascot';

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const off: MascotConfig = { ...on, enabled: false };
const poses: MascotPose[] = ['greet', 'cheer', 'think', 'rest'];

const meta = {
  title: 'game/MascotBubble',
  component: MascotBubble,
  tags: ['autodocs'],
  args: { pose: 'greet', size: 'md', config: on, children: 'Salut ! Choisis un monde pour commencer.' },
} satisfies Meta<typeof MascotBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MascotDisabled: Story = { args: { config: off } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg', pose: 'cheer', children: 'Bravo, tu as fini le chapitre !' } };
export const LongText: Story = {
  args: {
    children:
      'Il était une fois un renard curieux qui voulait compter toutes les étoiles du ciel, une par une, avant le lever du soleil.',
  },
};
export const AllPoses: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {poses.map((p) => (
        <MascotBubble key={p} {...args} pose={p}>
          {p}
        </MascotBubble>
      ))}
    </div>
  ),
};
export const WithAndWithout: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <MascotBubble {...args} config={on} />
      <MascotBubble {...args} config={off} />
    </div>
  ),
};
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
