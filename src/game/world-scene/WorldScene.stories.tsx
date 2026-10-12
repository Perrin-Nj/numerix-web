import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorldScene, type WorldSceneVariant } from './WorldScene';
import { WORLD_IDS } from '@/lib/api/types';

const meta = {
  title: 'game/WorldScene',
  component: WorldScene,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'No sound, no text (decorative svg, the parent names it). Layers drift slowly; motion stops under reduced motion. Moods: success glow and sparkles, detour side path, surprise swirl.',
      },
    },
  }, // sounds-note
  args: { world: 'nature', variant: 'hero', mood: 'idle' },
  decorators: [
    (Story) => (
      <div className="aspect-[16/9] max-w-2xl overflow-hidden rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorldScene>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { mood: 'success' } };
export const Detour: Story = { args: { mood: 'detour' } };
export const Surprise: Story = { args: { mood: 'surprise' } };

const grid = (variant: WorldSceneVariant, box: string) =>
  function Render() {
    return (
      <div className="flex flex-wrap gap-4">
        {WORLD_IDS.map((w) => (
          <div key={w} className={`${box} overflow-hidden rounded-lg`}>
            <WorldScene world={w} variant={variant} />
          </div>
        ))}
      </div>
    );
  };

export const AllHero: Story = { render: grid('hero', 'aspect-[16/9] w-72') };
export const AllBanner: Story = { render: grid('banner', 'h-24 w-72') };
export const AllTiles80: Story = { render: grid('tile', 'size-20') };
export const AllMoods: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {WORLD_IDS.flatMap((w) =>
        (['success', 'detour', 'surprise'] as const).map((m) => (
          <div key={`${w}${m}`} className="aspect-[16/9] w-60 overflow-hidden rounded-lg">
            <WorldScene world={w} variant="hero" mood={m} />
          </div>
        )),
      )}
    </div>
  ),
};
export const Dark: Story = { render: grid('hero', 'aspect-[16/9] w-72'), globals: { theme: 'dark' } };
export const HighContrast: Story = { render: grid('hero', 'aspect-[16/9] w-72'), globals: { theme: 'hc' } };
export const ReducedMotion: Story = { render: grid('hero', 'aspect-[16/9] w-72'), globals: { motion: 'reduced' } };
export const TVScale: Story = { render: grid('hero', 'aspect-[16/9] w-96'), globals: { display: 'tv' } };
export const French: Story = { render: grid('banner', 'h-24 w-72'), globals: { locale: 'fr-CA' } };
export const English: Story = { render: grid('banner', 'h-24 w-72'), globals: { locale: 'en-CA' } };
