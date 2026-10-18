import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mascot, type MascotConfig, type MascotPose, type MascotSize } from './Mascot';

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const rabbit: MascotConfig = { ...on, kind: 'lottie', src: '/mascot/rabbit-balloon.lottie' };
const off: MascotConfig = { ...on, enabled: false };
const poses: MascotPose[] = ['greet', 'cheer', 'think', 'rest', 'curious', 'amazed', 'happy', 'sad'];
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
  args: { config: { ...on, kind: 'rive' } },
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
export const Happy: Story = { args: { pose: 'happy', size: 'lg' } };
export const Sad: Story = { args: { pose: 'sad', size: 'lg' } };
export const Dark: Story = { render: AllPoses.render, globals: { theme: 'dark' } };
export const HighContrast: Story = { render: AllPoses.render, globals: { theme: 'hc' } };
export const French: Story = { args: { pose: 'sad' }, globals: { locale: 'fr-CA' } };
export const English: Story = { args: { pose: 'happy' }, globals: { locale: 'en-CA' } };
export const TvScale: Story = { globals: { display: 'tv' } };

const rabbitPoses: Story['render'] = (args) => (
  <ul className="flex flex-wrap gap-8">
    {poses.map((p) => (
      <li key={p} className="flex flex-col items-center gap-2 text-sm text-muted">
        <Mascot {...args} config={rabbit} pose={p} size="lg" />
        {p}
      </li>
    ))}
  </ul>
);
export const RabbitAllPoses: Story = {
  render: rabbitPoses,
  parameters: { docs: { description: { story: 'One Lottie only. greet, rest, curious: slow loop. cheer: loop. amazed, happy: fast loop. think: paused mid frame. sad: first frame, tilted and dimmed. More poses need more files.' } } },
};
export const RabbitDark: Story = { render: rabbitPoses, globals: { theme: 'dark' } };
export const RabbitLight: Story = { render: rabbitPoses, globals: { theme: 'light' } };
export const RabbitReducedMotion: Story = { render: rabbitPoses, globals: { motion: 'reduced' } };
export const RabbitFrench: Story = { args: { config: rabbit, pose: 'cheer', size: 'lg' }, globals: { locale: 'fr-CA' } };
export const RabbitLoadFailureFallsBackToEmoji: Story = {
  args: { config: { ...rabbit, src: '/mascot/missing.lottie' }, size: 'lg' },
};
