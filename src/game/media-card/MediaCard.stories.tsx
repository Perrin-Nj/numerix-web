import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { MediaItem } from '@/data/api/types';
import { MediaCard } from './MediaCard';

// Demo files live in public/story-media (copied from the real seed, see public/LICENSES.md)
const photo: MediaItem = {
  id: 'honeycomb',
  media_kind: 'photo',
  title: 'Un rayon de miel',
  caption: 'Les alvéoles des abeilles sont des hexagones: des formes à six côtés qui s’emboîtent parfaitement.',
  alt: 'Des abeilles sur un rayon de miel',
  question: { prompt: 'Combien de côtés ont trois hexagones ?', answer: '18 côtés (3 × 6).' },
  world: 'nature',
  topic: 'shapes',
  tags: ['shapes', 'nature', 'photo'],
  grade_min: 2,
  src: '/story-media/photo-960.webp',
  src_small: '/story-media/photo-480.webp',
  width: 960,
  height: 720,
  lqip: 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4IDwAAADQAQCdASoYABIAPzmGO5ZAIjkaDNUAnxg7YtodMTQr8MfSZzzLB0yZ6OTFgb5rRDhx3t1Zi5Ft0AAA',
  source_url: 'https://stocksnap.io/photo/bees-nature-X0IOWXEOFJ',
  creator: 'Travel Photographer',
  licence: 'CC0 1.0',
  attribution: '“Bees Nature”, Travel Photographer, CC0 1.0, via stocksnap.io',
};

const video: MediaItem = {
  ...photo,
  id: 'bee-takeoff',
  media_kind: 'video',
  title: 'Une abeille qui décolle, au ralenti',
  caption: 'Une abeille bat des ailes environ 230 fois par seconde. Au ralenti, on voit chaque battement.',
  alt: 'Une abeille décolle d’une fleur rouge',
  question: undefined,
  duration_ms: 20000,
  src: '/story-media/video.mp4',
  src_small: undefined,
  poster: '/story-media/video-poster.webp',
  width: 768,
  height: 480,
  has_audio: true,
  captions: [
    { lang: 'fr-CA', label: 'Français', src: '/story-media/video-fr.vtt' },
    { lang: 'en-CA', label: 'English', src: '/story-media/video-en.vtt' },
  ],
  creator: 'Joris Schaap',
  licence: 'CC BY 3.0',
  attribution: '“Honey bee takes off in ultra slow motion” by Joris Schaap, CC BY 3.0, via commons.wikimedia.org',
};

const animation: MediaItem = {
  ...video,
  id: 'cycloid',
  media_kind: 'animation',
  title: 'La courbe d’un point sur une roue',
  caption: 'Un point sur le bord d’une roue qui roule dessine une courbe en arches, la cycloïde.',
  has_audio: undefined,
  captions: undefined,
  src: '/story-media/loop.mp4',
  poster: '/story-media/loop-poster.webp',
  creator: 'IchibanPL',
  licence: 'Public domain',
  attribution: '“Cycloid”, IchibanPL, Public domain, via commons.wikimedia.org',
};

const meta = {
  title: 'game/MediaCard',
  component: MediaCard,
  tags: ['autodocs'],
  args: { media: photo, liked: false, saved: false, onReact: fn() },
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="mx-auto max-w-2xl"><Story /></div>],
} satisfies Meta<typeof MediaCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A real photo with a fun fact and a tap-to-reveal question. Owl Numa reacts to the answer. */
export const PhotoWithQuestion: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /voir la réponse/i }));
    await expect(c.getByText(/18 côtés/)).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: /j.aime/i }));
    await expect(args.onReact).toHaveBeenCalledWith({ liked: true, saved: false });
  },
};

/** A captioned video: muted until the child taps the sound button, captions on by default. */
export const VideoWithCaptionsAndSound: Story = { args: { media: video } };

/** A looping animation with no sound and no captions. */
export const Animation: Story = { args: { media: animation } };

/** Liked and saved state. */
export const LikedAndSaved: Story = { args: { liked: true, saved: true } };

/** A file that does not load shows a message and a retry button, never a blank box. */
export const BrokenPhoto: Story = {
  args: { media: { ...photo, src: '/story-media/missing.webp', src_small: '/story-media/missing-480.webp' } },
};
