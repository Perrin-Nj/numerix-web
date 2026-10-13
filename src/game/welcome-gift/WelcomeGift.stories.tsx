import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { WelcomeGift } from './WelcomeGift';

const meta = {
  title: 'game/WelcomeGift',
  component: WelcomeGift,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Sounds: `gift_open` on tap, `card_earned` when the card rises, `chapter_complete` on claim. Lid flight, rays, spin and confetti are off under reduced motion (simple fade).' } },
  }, // sounds-note
  args: {
    open: true,
    onClaim: fn(),
    card: {
      id: 'card-1',
      world: 'nature',
      title: 'Le premier pas dans la forêt',
      earnedAt: '2026-03-14T15:00:00Z',
      source: 'welcome',
    },
  },
} satisfies Meta<typeof WelcomeGift>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const OpenAndClaim: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole('button', { name: /cadeau|gift/i }));
    await userEvent.click(await body.findByRole('button', { name: /collection/i }, { timeout: 5000 }));
    await expect(args.onClaim).toHaveBeenCalled();
  },
};
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { globals: { locale: 'en-CA' } };
