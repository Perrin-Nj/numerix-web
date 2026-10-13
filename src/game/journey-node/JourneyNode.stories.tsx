import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { JourneyNode } from './JourneyNode';
import type { JourneyNode as Data, NodeState } from '@/lib/api/types';

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
