import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MenuTile, type MenuTileTone } from './MenuTile';

const meta = {
  title: 'game/MenuTile',
  component: MenuTile,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Sound: `select`. Tiles with a badge wobble gently; the badge pops in.' } },
  }, // sounds-note
  args: { icon: 'map', label: 'Mes mondes', hint: 'Huit univers à explorer', onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};
export const WithBadge: Story = { args: { icon: 'trophy', label: 'Défis', badge: 3, tone: 'warning' } };
export const TextBadge: Story = { args: { icon: 'gift', label: 'Cadeau', badge: 'Nouveau', tone: 'success' } };

const allTones: Story = {
  render: (args) => (
    <div className="grid max-w-xl grid-cols-2 gap-4">
      {(['brand', 'success', 'warning', 'info', 'world'] as MenuTileTone[]).map((tone, i) => (
        <div key={tone} className="nx-pop-in-stagger" style={{ '--i': i } as CSSProperties}>
          <MenuTile {...args} tone={tone} label={tone} badge={i === 1 ? 2 : undefined} />
        </div>
      ))}
    </div>
  ),
};
export const AllTones: Story = allTones;
export const Dark: Story = { ...allTones, globals: { theme: 'dark' } };
export const HighContrast: Story = { ...allTones, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { ...allTones, globals: { motion: 'reduced' } };
export const TVScale: Story = { ...allTones, globals: { display: 'tv' } };
export const French: Story = { args: { badge: 2 }, globals: { locale: 'fr-CA' } };
export const English: Story = {
  args: { label: 'My worlds', hint: 'Eight universes to explore', badge: 2 },
  globals: { locale: 'en-CA' },
};
