import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ScenePicture } from './ScenePicture';
import { WORLD_IDS } from '@/lib/api/types';

const meta = {
  title: 'game/ScenePicture',
  component: ScenePicture,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'No sound. Draws the real quantities with the world object. Items pop in one by one; motion stops under reduced motion. Groups cap at 60, tens are bundled.',
      },
    },
  }, // sounds-note
  args: { world: 'nature', skillId: 'ARI-OPE-A02a', numbers: [28, 19] },
  decorators: [
    (Story) => (
      <div className="max-w-xl rounded-lg border-2 border-line p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScenePicture>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Addition: Story = {};
export const AdditionSmall: Story = { args: { world: 'espace', numbers: [4, 3] } };
export const AdditionCapped: Story = { args: { world: 'cuisine', numbers: [95, 40] } };
export const Subtraction: Story = { args: { world: 'sport', skillId: 'ARI-SUB-A01', numbers: [24, 9] } };
export const MissingAddend: Story = { args: { world: 'construction', skillId: 'ARI-OPE-A05', numbers: [12, 20] } };
export const Multiplication: Story = { args: { world: 'medecine', skillId: 'ARI-OPE-A06a', numbers: [4, 7] } };
export const Division: Story = { args: { world: 'science', skillId: 'ARI-SOP-A03a', numbers: [12, 3] } };
export const DivisionRemainder: Story = { args: { world: 'echecs', skillId: 'ARI-OPE-A07a', numbers: [17, 4] } };
export const NumberLine: Story = { args: { skillId: 'ARI-SEN-A01c', numbers: [347] } };
export const DifferentNumbers: Story = {
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <ScenePicture {...args} numbers={[28, 19]} />
      <ScenePicture {...args} numbers={[13, 31]} />
    </div>
  ),
};
export const AllWorlds: Story = {
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {WORLD_IDS.map((w) => (
        <ScenePicture key={w} {...args} world={w} numbers={[13, 8]} />
      ))}
    </div>
  ),
};
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { globals: { locale: 'en-CA' } };
