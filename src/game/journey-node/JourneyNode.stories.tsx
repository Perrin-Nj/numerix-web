import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { JourneyNode } from './JourneyNode';
import { mockMedia } from '@/game/media-image';
import type { JourneyNode as Data, NodeState } from '@/data/api/types';

const node = (state: NodeState, level = 0): Data => ({
  skill_id: 'ARI-OPE-A07a',
  label: 'Partager en parts égales',
  state,
  position: { row: 0, col: 2 },
  level,
});

const meta = {
  title: 'game/JourneyNode',
  component: JourneyNode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Sounds: `select` on an open node, `close` when a locked node is pressed. Mastered nodes sparkle.',
      },
    },
  }, // sounds-note
  args: { node: node('available'), onSelect: fn() },
} satisfies Meta<typeof JourneyNode>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};
export const Locked: Story = { args: { node: node('locked') } };
/** The quest has too few questions for the child's school year yet: shown locked with its own caption. */
export const LockedForGrade: Story = { args: { node: { ...node('locked'), locked_reason: 'grade' } } };
export const InProgress: Story = { args: { node: node('in_progress') } };
export const Mastered: Story = { args: { node: node('mastered', 0) } };
export const MasteredLevel3: Story = { args: { node: node('mastered', 3) } };
export const MasteredLevel5: Story = { args: { node: node('mastered', 5) } };
export const NeedsReview: Story = { args: { node: node('needs_review', 2) } };
export const Current: Story = { args: { current: true } };
export const WithAccent: Story = { args: { accent: '#3fa34d' } };
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(['locked', 'available', 'in_progress', 'mastered', 'needs_review'] as const).map((s) => (
        <JourneyNode key={s} node={node(s, 2)} onSelect={() => {}} />
      ))}
    </div>
  ),
};
export const TVScale: Story = { ...AllStates, globals: { display: 'tv' } };

const thumb = mockMedia('#1d7fb8', 'Reef', 480, 480);
const quest = { id: 'ocean.recif', name: 'Les poissons du récif', goal: 'Compter des poissons par groupes' };
export const WithPhoto: Story = { args: { node: { ...node('available'), quest }, thumb } };
export const WithPhotoLocked: Story = { args: { node: { ...node('locked'), quest }, thumb } };
export const WithPhotoMastered: Story = { args: { node: { ...node('mastered', 2), quest }, thumb } };
