import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Reaction, REACTION_NAMES } from './Reaction';

const meta = {
  title: 'game/Reaction',
  component: Reaction,
  tags: ['autodocs'],
  args: { name: 'happy', size: 96 },
} satisfies Meta<typeof Reaction>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Sad: Story = { args: { name: 'sad' } };
export const All: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-4">
      {REACTION_NAMES.map((n) => (
        <Reaction key={n} {...args} name={n} />
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
