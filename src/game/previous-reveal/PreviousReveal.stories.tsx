import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PreviousReveal } from './PreviousReveal';

const reveal = {
  question: 'Combien de pions reste-t-il sur la rangée ?',
  correctAnswer: 7,
  text: 'Les pions se rangent bien, la rangée en compte sept.',
  feedback: 'Presque ! Compte aussi le pion du bout.',
  explain: '3 + 4 = 7',
};

const meta = {
  title: 'game/PreviousReveal',
  component: PreviousReveal,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Read-only dialog of the previous reveal. Nothing is stored. Escape or Close dismisses it.' } } },
  args: { reveal },
} satisfies Meta<typeof PreviousReveal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const OpenMinimal: Story = { args: { defaultOpen: true, reveal: { question: 'Vrai ou faux ?', correctAnswer: true } } };
export const OpenPhone: Story = { args: { defaultOpen: true }, globals: { viewport: { value: 'phone' } } };
export const Dark: Story = { args: { defaultOpen: true }, globals: { theme: 'dark' } };
export const HighContrast: Story = { args: { defaultOpen: true }, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { args: { defaultOpen: true }, globals: { motion: 'reduced' } };
export const TVScale: Story = { args: { defaultOpen: true }, globals: { display: 'tv' } };
export const French: Story = { args: { defaultOpen: true }, globals: { locale: 'fr-CA' } };
export const English: Story = {
  args: { defaultOpen: true, reveal: { question: 'How many pawns are left in the row?', correctAnswer: 7, feedback: 'So close! Count the pawn at the end too.', explain: '3 + 4 = 7' } },
  globals: { locale: 'en-CA' },
};
