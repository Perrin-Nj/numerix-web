import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mascot, type MascotConfig, type MascotPose, type MascotSize } from './Mascot';

const owl: MascotConfig = { enabled: true, kind: 'owl' };

const off: MascotConfig = { ...owl, enabled: false };
const six: MascotPose[] = ['idle', 'wave', 'think', 'cheer', 'sad', 'sleepy'];
const old: MascotPose[] = ['greet', 'rest', 'curious', 'amazed', 'happy'];
const sizes: MascotSize[] = ['sm', 'md', 'lg'];

const meta = {
  title: 'game/Mascot',
  component: Mascot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Numa the owl, a layered SVG drawn in code. No sound. Six poses with animated transitions; idle blinks, tilts and glances at random; pupils follow the pointer and focus. Reduced motion keeps the pose and stops the movement.',
      },
    },
  }, // sounds-note
  args: { pose: 'idle', size: 'lg', config: owl },
} satisfies Meta<typeof Mascot>;
export default meta;
type Story = StoryObj<typeof meta>;

function Grid({ poses, ...args }: React.ComponentProps<typeof Mascot> & { poses: MascotPose[] }) {
  return (
    <ul className="flex flex-wrap gap-8">
      {poses.map((p) => (
        <li key={p} className="flex flex-col items-center gap-2 text-sm text-muted">
          <Mascot {...args} pose={p} />
          {p}
        </li>
      ))}
    </ul>
  );
}
const grid = (poses: MascotPose[]): Story['render'] => function Poses(args) {
  return <Grid {...args} poses={poses} />;
};

export const Default: Story = {};
export const Idle: Story = { args: { pose: 'idle' } };
export const Wave: Story = { args: { pose: 'wave' } };
export const Think: Story = { args: { pose: 'think' } };
export const Cheer: Story = { args: { pose: 'cheer' } };
export const Sad: Story = { args: { pose: 'sad' } };
export const Sleepy: Story = { args: { pose: 'sleepy' } };
export const Speaking: Story = { args: { pose: 'wave', speaking: true } };
export const LookLeft: Story = { args: { look: { x: -1, y: 0 } } };
export const LookUpRight: Story = { args: { look: { x: 1, y: -1 } } };
export const AllPoses: Story = { render: grid(six) };
export const OldPoseNames: Story = {
  render: grid(old),
  parameters: { docs: { description: { story: 'greet is wave, rest is idle, curious is think, amazed and happy are cheer.' } } },
};
export const Light: Story = { render: grid(six), globals: { theme: 'light' } };
export const Dark: Story = { render: grid(six), globals: { theme: 'dark' } };
export const HighContrast: Story = { render: grid(six), globals: { theme: 'hc' } };
export const ReducedMotion: Story = { render: grid(six), globals: { motion: 'reduced' } };
export const French: Story = { render: grid(six), globals: { locale: 'fr-CA' } };
export const English: Story = { render: grid(six), globals: { locale: 'en-CA' } };
export const TvScale: Story = { globals: { display: 'tv' } };
export const AllSizes: Story = {
  render: (args) => (
    <ul className="flex items-end gap-8">
      {sizes.map((s) => (
        <li key={s} className="flex flex-col items-center gap-2 text-sm text-muted">
          <Mascot {...args} size={s} />
          {s === 'sm' ? 'small 48px' : s === 'md' ? 'medium 120px' : 'hero 240px'}
        </li>
      ))}
    </ul>
  ),
};
export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Hero: Story = { args: { size: 'lg' } };
export const Disabled: Story = {
  args: { config: off },
  render: (args) => (
    <div className="flex items-center gap-3 rounded-md border-2 border-line p-4">
      <Mascot {...args} />
      <span className="font-display text-fg">Layout sans mascotte, aucun trou.</span>
    </div>
  ),
};
export const UnimplementedKindFallsBack: Story = { args: { config: { ...owl, kind: 'rive' }, size: 'md' } };
