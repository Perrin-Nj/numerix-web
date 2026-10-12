'use client';
import { useEffect, type ReactNode } from 'react';
import { appConfig, type MascotKind } from '@/config/app';
import { cn } from '@/lib/cn';

export type MascotPose = 'greet' | 'cheer' | 'think' | 'rest' | 'curious' | 'amazed' | 'happy' | 'sad';
export type MascotSize = 'sm' | 'md' | 'lg';
export type MascotConfig = { enabled: boolean; kind: MascotKind; emoji: string; src: string };

/** One small interface so image, lottie and rive sets can plug in later. */
export interface MascotAdapter {
  render(pose: MascotPose, size: MascotSize): ReactNode;
}

const SIZE: Record<MascotSize, string> = { sm: 'text-4xl', md: 'text-6xl', lg: 'text-8xl' };
// Pose only changes the animation class, so a later art set maps one to one.
const POSE: Record<MascotPose, string> = {
  greet: 'nx-pop',
  cheer: 'nx-wiggle',
  think: '-rotate-6',
  rest: 'opacity-80',
  curious: 'rotate-6',
  amazed: 'nx-heart',
  happy: 'nx-mascot-happy',
  sad: 'nx-mascot-sad',
};
// Small face badge: big smile for happy, soft and tear free for sad.
const BADGE: Partial<Record<MascotPose, string>> = { happy: '😄', sad: '😔' };

export function emojiAdapter(emoji: string): MascotAdapter {
  return {
    render: (pose, size) => (
      <span className={cn('relative inline-block select-none leading-none', SIZE[size], POSE[pose])}>
        {emoji}
        {BADGE[pose] && <span className="absolute -bottom-1 -right-2 text-[0.42em]">{BADGE[pose]}</span>}
      </span>
    ),
  };
}

export type MascotProps = {
  pose?: MascotPose;
  size?: MascotSize;
  speaking?: boolean;
  /** Overrides `appConfig.mascot`. Used by stories. */
  config?: MascotConfig;
  className?: string;
};

export function Mascot({ pose = 'greet', size = 'md', speaking, config, className }: MascotProps) {
  const cfg = config ?? appConfig.mascot;
  useEffect(() => {
    if (cfg.enabled && cfg.kind !== 'emoji' && appConfig.env === 'development') {
      console.warn(`Mascot kind "${cfg.kind}" is not implemented yet, using emoji.`);
    }
  }, [cfg.enabled, cfg.kind]);
  if (!cfg.enabled) return null;
  return (
    <span aria-hidden className={cn('inline-flex shrink-0', pose !== 'rest' && pose !== 'happy' && pose !== 'sad' && 'nx-float', className)}>
      <span className={cn('inline-flex', speaking && 'nx-pulse', !speaking && (pose === 'greet' || pose === 'curious') && 'nx-tilt')}>{emojiAdapter(cfg.emoji).render(pose, size)}</span>
    </span>
  );
}
