import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MethodVisual } from './MethodVisual';

const meta = {
  title: 'game/MethodVisual',
  component: MethodVisual,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Animated how-to-solve picture drawn from backend data (kind, params, captions). Place-value blocks regroup for a carry or a borrow, equal groups for times tables, sharing for division. Reduced motion shows the finished picture.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-96 max-w-xl rounded-lg bg-elevated p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    visual: {
      kind: 'add_carry',
      params: { a: 36, b: 19 },
      steps: [
        { caption: 'On met les unités ensemble : 6 et 9 font 15.' },
        { caption: 'Dix unités font une dizaine. On la déplace à gauche.' },
        { caption: 'Au total : 55.' },
      ],
      alt: 'Des blocs montrent 36 plus 19. Dix unités deviennent une dizaine, le total est 55.',
      cache_key: 'add_carry:36,19:fr',
    },
  },
} satisfies Meta<typeof MethodVisual>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AddWithCarry: Story = {};
export const AddThreeDigits: Story = {
  args: { visual: { kind: 'add_carry', params: { a: 567, b: 23 }, steps: [{ caption: 'Unités : 7 et 3 font 10.' }, { caption: 'Dix unités font une dizaine.' }, { caption: 'Au total : 590.' }], alt: '567 plus 23 font 590.', cache_key: 'add_carry:567,23:fr' } },
};
export const SubtractWithBorrow: Story = {
  args: { visual: { kind: 'sub_borrow', params: { a: 54, b: 36 }, steps: [{ caption: 'On part de 54.' }, { caption: '4 unités, ce n’est pas assez pour en enlever 6. On casse une dizaine.' }, { caption: 'On enlève 36. Il reste 18.' }], alt: '54 moins 36 font 18.', cache_key: 'sub_borrow:54,36:fr' } },
};
export const TimesTable: Story = {
  args: { visual: { kind: 'equal_groups', params: { groups: 4, size: 6 }, steps: [{ caption: '4 groupes.' }, { caption: '6 dans chaque groupe.' }, { caption: '4 groupes de 6 font 24.' }], alt: '4 groupes de 6 points font 24.', cache_key: 'equal_groups:4,6:fr' } },
};
export const Sharing: Story = {
  args: { visual: { kind: 'equal_share', params: { total: 20, parts: 4 }, steps: [{ caption: 'On a 20.' }, { caption: 'On partage en 4 parts, un à la fois.' }, { caption: 'Chaque part reçoit 5.' }], alt: '20 points partagés en 4 parts de 5.', cache_key: 'equal_share:20,4:fr' } },
};
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { globals: { locale: 'en-CA' } };
