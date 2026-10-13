import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Reveal } from './Reveal';

const Card = ({ n }: { n: number }) => (
  <div className="rounded-md border-2 border-line bg-elevated p-4 text-fg shadow-1">Carte {n}</div>
);

const meta = {
  title: 'ui/Reveal',
  component: Reveal,
  tags: ['autodocs'],
  args: { children: <Card n={1} /> },
} satisfies Meta<typeof Reveal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Staggered: Story = {
  render: () => (
    <ul className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <Reveal key={n} as="li" delayMs={n * 100}>
          <Card n={n} />
        </Reveal>
      ))}
    </ul>
  ),
};
export const AsSection: Story = { args: { as: 'section' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TvScale: Story = { globals: { display: 'tv' } };
