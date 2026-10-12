import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mascot, type MascotConfig, type MascotPose, type MascotSize } from './Mascot';

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const off: MascotConfig = { ...on, enabled: false };
const poses: MascotPose[] = ['greet', 'cheer', 'think', 'rest', 'curious', 'amazed'];
const sizes: MascotSize[] = ['sm', 'md', 'lg'];

const meta = {
  title: 'game/Mascot',
  component: Mascot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'No sound. Idle float; cheer wiggles; amazed does a heart pulse.',
      },
    },
  }, // sounds-note
  args: { pose: 'greet', size: 'md', config: on },
} satisfies Meta<typeof Mascot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Enabled: Story = { args: { config: on } };
export const Disabled: Story = {
  args: { config: off },
  render: (args) => (
    <div className="flex items-center gap-3 rounded-md border-2 border-line p-4">
      <Mascot {...args} />
      <span className="font-display text-fg">Layout sans mascotte, aucun trou.</span>
    </div>
  ),
};
export const Speaking: Story = { args: { speaking: true } };
export const AllPoses: Story = {
  render: (args) => (
    <ul className="flex flex-wrap gap-8">
      {poses.map((p) => (
        <li key={p} className="flex flex-col items-center gap-2 text-sm text-muted">
          <Mascot {...args} pose={p} size="lg" />
          {p}
        </li>
      ))}
    </ul>
  ),
};
export const AllSizes: Story = {
  render: (args) => (
    <ul className="flex items-end gap-8">
      {sizes.map((s) => (
        <li key={s} className="flex flex-col items-center gap-2 text-sm text-muted">
          <Mascot {...args} size={s} />
          {s}
        </li>
      ))}
    </ul>
  ),
};
export const CustomEmoji: Story = { args: { config: { ...on, emoji: '🐼' } } };
export const UnimplementedKindFallsBack: Story = {
  args: { config: { ...on, kind: 'lottie' } },
};
export const CheerWiggle: Story = { args: { pose: 'cheer', size: 'lg' } };
export const IdleFloat: Story = {
  args: { pose: 'greet', size: 'lg' },
  parameters: {
    docs: {
      description: { story: 'Idle bob (nx-float) on every pose except rest.' },
    },
  },
};
export const ReducedMotion: Story = {
  args: { pose: 'cheer', speaking: true },
  globals: { motion: 'reduced' },
};
export const TvScale: Story = { globals: { display: 'tv' } };
