import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { JourneyPath } from './JourneyPath';
import type { JourneyNode, NodeState } from '@/lib/api/types';

const STATES: NodeState[] = [
  'mastered',
  'mastered',
  'needs_review',
  'in_progress',
  'available',
  'locked',
  'locked',
  'locked',
];
const COLS = [2, 3, 1, 2, 3, 1, 0, 2];
const NODES: JourneyNode[] = STATES.map((state, i) => ({
  skill_id: `SKILL-${i}`,
  label: ['Compter', 'Ajouter', 'Retenue', 'Partager', 'Tables', 'Fractions', 'Mesures', 'Défi final'][i],
  state,
  position: { row: i, col: COLS[i] },
  level: state === 'mastered' ? i + 2 : 0,
}));

const meta = {
  title: 'game/JourneyPath',
  component: JourneyPath,
  tags: ['autodocs'],
  args: {
    nodes: NODES,
    world: 'nature',
    currentSkillId: 'SKILL-4',
    accent: undefined,
    onSelectNode: fn(),
    onPlay: fn(),
  },
} satisfies Meta<typeof JourneyPath>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getAllByRole('button').at(-1)!);
    await expect(args.onPlay).toHaveBeenCalled();
  },
};
export const FirstSteps: Story = {
  args: {
    nodes: NODES.slice(0, 3).map((n, i) => ({
      ...n,
      state: i === 0 ? 'available' : 'locked',
      level: 0,
    })),
    currentSkillId: 'SKILL-0',
  },
};
export const Empty: Story = { args: { nodes: [], currentSkillId: null } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const TVScale: Story = {
  globals: { display: 'tv', viewport: { value: 'tv' } },
};
