import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ConsequenceScene } from './ConsequenceScene';
import { FAMILIES, SCENES } from './catalog';

const meta = {
  title: 'game/ConsequenceScene',
  component: ConsequenceScene,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'What happens in the picture after an answer: a light physics solver (gravity, bounce, spring, slide, collision) drives real object photos. A wrong answer visibly breaks the thing, a right answer visibly works. 8 topic families x 6 set-ups x 2 endings. Reduced motion shows the finished picture. The caption only says what the picture shows.',
      },
    },
  },
  args: { sceneId: 'addsub.tower.ko', world: 'construction' },
  decorators: [(Story) => <div className="h-72 max-w-xl"><Story /></div>],
} satisfies Meta<typeof ConsequenceScene>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TowerWrong: Story = {};
export const TowerRight: Story = { args: { sceneId: 'addsub.tower.ok' } };
export const BridgeWrong: Story = { args: { sceneId: 'multdiv.bridge.ko', world: 'nature' } };
export const BridgeRight: Story = { args: { sceneId: 'multdiv.bridge.ok', world: 'nature' } };
export const ScaleWrong: Story = { args: { sceneId: 'fractions.scale.ko', world: 'cuisine' } };
export const ScaleRight: Story = { args: { sceneId: 'fractions.scale.ok', world: 'cuisine' } };
export const JugWrong: Story = { args: { sceneId: 'measure.jug.ko', world: 'science' } };
export const JugRight: Story = { args: { sceneId: 'measure.jug.ok', world: 'science' } };
export const ShelfWrong: Story = { args: { sceneId: 'geometry.shelf.ko', world: 'robots' } };
export const ShelfRight: Story = { args: { sceneId: 'geometry.shelf.ok', world: 'robots' } };
export const CollideWrong: Story = { args: { sceneId: 'time.collide.ko', world: 'sport' } };
export const CollideRight: Story = { args: { sceneId: 'time.collide.ok', world: 'sport' } };
export const Still: Story = { args: { playing: false } };

/** Every scene of the library as its finished picture (the grid the QA screenshots use). */
export const Library: Story = {
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="max-w-none"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-library="">
      {SCENES.map((s) => (
        <div key={s.id} className="h-56">
          <ConsequenceScene sceneId={s.id} world="construction" playing={false} seed={4 + FAMILIES.indexOf(s.family)} />
        </div>
      ))}
    </div>
  ),
};
