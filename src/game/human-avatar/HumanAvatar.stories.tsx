import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HumanAvatar } from './HumanAvatar';
import { HERO_BY_WORLD } from './heroes';

const meta = {
  title: 'game/HumanAvatar',
  component: HumanAvatar,
  tags: ['autodocs'],
  args: { seed: 'Mira', size: 96 },
} satisfies Meta<typeof HumanAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Moods: Story = {
  render: (args) => (
    <div className="flex gap-3">
      {(['neutral', 'happy', 'sad', 'thinking'] as const).map((m) => (
        <HumanAvatar key={m} {...args} mood={m} />
      ))}
    </div>
  ),
};
export const Heroes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {Object.values(HERO_BY_WORLD).map((h) => (
        <HumanAvatar key={h} {...args} seed={h} />
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
