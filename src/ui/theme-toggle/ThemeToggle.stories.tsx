import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ThemeToggle } from './ThemeToggle';

const meta = {
  title: 'ui/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Sound: `switch`. Icon variant cycles system, light, dark, high contrast.' } },
  }, // sounds-note
  args: { variant: 'icon' },
} satisfies Meta<typeof ThemeToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Icon: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole('button');
    await userEvent.click(btn);
    await expect(btn).toBeInTheDocument();
  },
};
export const Row: Story = { args: { variant: 'row' } };
export const Dark: Story = { args: { variant: 'row' }, globals: { theme: 'dark' } };
export const HighContrast: Story = { args: { variant: 'row' }, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { args: { variant: 'row' }, globals: { motion: 'reduced' } };
export const TVScale: Story = { args: { variant: 'row' }, globals: { display: 'tv' } };
export const English: Story = { args: { variant: 'row' }, globals: { locale: 'en-CA' } };
