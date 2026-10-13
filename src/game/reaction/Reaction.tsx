'use client';
import { cn } from '@/shared/cn';
import { useReducedMotion } from '@/platform/motion';

export const REACTIONS = {
  happy: { cp: '😀', anim: 'nx-react-bounce' },
  sad: { cp: '😔', anim: 'nx-react-sway' },
  thinking: { cp: '🤔', anim: 'nx-react-sway' },
  party: { cp: '🥳', anim: 'nx-react-bounce' },
  hug: { cp: '🤗', anim: 'nx-react-pulse' },
  'thumbs-up': { cp: '👍', anim: 'nx-react-bounce' },
  'star-struck': { cp: '🤩', anim: 'nx-react-pulse' },
  pleading: { cp: '🥺', anim: 'nx-react-sway' },
  sleepy: { cp: '😴', anim: 'nx-react-sway' },
  wave: { cp: '👋', anim: 'nx-react-wave' },
  clap: { cp: '👏', anim: 'nx-react-pulse' },
  hearts: { cp: '🥰', anim: 'nx-react-pulse' },
} as const;
export type ReactionName = keyof typeof REACTIONS;
export const REACTION_NAMES = Object.keys(REACTIONS) as ReactionName[];

export type ReactionProps = { name: ReactionName; size?: number; className?: string };

/** Self hosted OpenMoji face, animated with CSS. Reduced motion: the still face. */
export function Reaction({ name, size = 64, className }: ReactionProps) {
  const reduced = useReducedMotion();
  const r = REACTIONS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/reactions/${name}.svg`}
      alt=""
      aria-hidden
      data-reaction={name}
      width={size}
      height={size}
      draggable={false}
      className={cn('inline-block shrink-0 select-none', !reduced && r.anim, className)}
      style={{ width: size, height: size }}
    />
  );
}
