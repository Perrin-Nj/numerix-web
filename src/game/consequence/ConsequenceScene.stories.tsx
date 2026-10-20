import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ConsequenceScene } from './ConsequenceScene';
import { FAMILIES, SCENES } from './catalog';
import { amountOf, rightAmount } from './amounts';

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

export const TowerWrong: Story = { args: { amount: amountOf(42, 47) } };
export const TowerRight: Story = { args: { sceneId: 'addsub.tower.ok', amount: rightAmount(42) } };
export const BridgeWrong: Story = { args: { sceneId: 'multdiv.bridge.ko', world: 'nature' } };
export const BridgeRight: Story = { args: { sceneId: 'multdiv.bridge.ok', world: 'nature' } };
export const ScaleWrong: Story = { args: { sceneId: 'fractions.scale.ko', world: 'cuisine', amount: amountOf(5, 3) } };
export const ScaleRight: Story = { args: { sceneId: 'fractions.scale.ok', world: 'cuisine' } };
export const JugWrong: Story = { args: { sceneId: 'measure.jug.ko', world: 'science', amount: amountOf(250, 400) } };
export const JugRight: Story = { args: { sceneId: 'measure.jug.ok', world: 'science' } };
export const ShelfWrong: Story = { args: { sceneId: 'geometry.shelf.ko', world: 'robots' } };
export const ShelfRight: Story = { args: { sceneId: 'geometry.shelf.ok', world: 'robots' } };
export const CollideWrong: Story = { args: { sceneId: 'time.collide.ko', world: 'sport' } };
export const CollideRight: Story = { args: { sceneId: 'time.collide.ok', world: 'sport' } };
export const Still: Story = { args: { playing: false } };

/** The 12 scenes of one family, simulated to rest (the grids the QA screenshots use). */
const library = (family: (typeof FAMILIES)[number]): Story => ({
  parameters: { layout: 'padded' },
  render: () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-library="">
      {SCENES.filter((s) => s.family === family).map((s) => (
        <div key={s.id} className="h-56">
          <ConsequenceScene sceneId={s.id} world="construction" playing={false} amount={s.good ? rightAmount(6) : amountOf(6, FAMILIES.indexOf(s.family) % 2 ? 4 : 9, FAMILIES.indexOf(s.family))} />
        </div>
      ))}
    </div>
  ),
});
export const LibraryNumber = library('number');
export const LibraryAddsub = library('addsub');
export const LibraryMultdiv = library('multdiv');
export const LibraryFractions = library('fractions');
export const LibraryMeasure = library('measure');
export const LibraryGeometry = library('geometry');
export const LibraryData = library('data');
export const LibraryTime = library('time');
