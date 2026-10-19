import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { QuestionVisual } from './QuestionVisual';

const meta = {
  title: 'game/QuestionVisual',
  component: QuestionVisual,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pictures the child reads in graph, table and measure questions. Drawn from data only (no answer in them). Bars grow in; no motion under reduced motion. No sound.',
      },
    },
  }, // sounds-note
  args: { visual: { kind: 'bars' } },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestionVisual>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bars: Story = {
  args: {
    visual: {
      kind: 'bars',
      data: { title: { fr: 'Fruits vendus', en: 'Fruit sold' }, bars: [{ label: 'Pommes', value: 12 }, { label: 'Poires', value: 7 }, { label: 'Bananes', value: 15 }] },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img')).toBeInTheDocument();
  },
};
export const Pictograph: Story = {
  args: { visual: { kind: 'pictograph', data: { title: { fr: 'Oiseaux vus', en: 'Birds seen' }, each: 2, rows: [{ label: 'Lundi', count: 3 }, { label: 'Mardi', count: 5 }] } } },
};
export const Clock: Story = { args: { visual: { kind: 'clock', data: { hour: 3, minute: 20 } } } };
export const NumberLine: Story = { args: { visual: { kind: 'numberline', data: { min: 0, max: 20, step: 1, labels: [0, 5, 10, 15, 20], arrow: 14 } } } };
export const Grid: Story = { args: { visual: { kind: 'grid', data: { cols: 4, rows: 3, cells: [{ x: 1, y: 1, label: 'A' }, { x: 3, y: 0, label: 'B' }] } } } };
export const Fraction: Story = { args: { visual: { kind: 'fraction', data: { parts: 8, filled: 3 } } } };
export const Dice: Story = { args: { visual: { kind: 'dice', data: { dice: [3, 5, 6] } } } };
