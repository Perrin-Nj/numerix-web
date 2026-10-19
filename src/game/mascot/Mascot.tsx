'use client';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import type { NumaPose, NumaProps } from './Numa';
import { appConfig, type MascotKind } from '@/config/app';
import { cn } from '@/shared/cn';
import { Reaction } from '@/game/reaction';

export type MascotPose =
  | 'greet' | 'cheer' | 'think' | 'rest' | 'curious' | 'amazed' | 'happy' | 'sad'
  | 'idle' | 'wave' | 'sleepy';
export type MascotSize = 'sm' | 'md' | 'lg';
export type MascotConfig = { enabled: boolean; kind: MascotKind; emoji: string; src?: string };

/** One small interface so image and rive sets can plug in later. */
export interface MascotAdapter {
  render(pose: MascotPose, size: MascotSize): ReactNode;
}

// Old pose names keep working: they map onto the six poses of Numa.
const OWL: Record<MascotPose, NumaPose> = {
  greet: 'wave', wave: 'wave', rest: 'idle', idle: 'idle', curious: 'think', think: 'think',
  cheer: 'cheer', amazed: 'cheer', happy: 'cheer', sad: 'sad', sleepy: 'sleepy',
};

// Height in px: small 48, medium 120, hero 240 (two thirds of that on phones, so a bubble never overflows).
const PX: Record<MascotSize, number> = { sm: 48, md: 120, lg: 240 };
const SIZE: Record<MascotSize, string> = { sm: 'text-4xl', md: 'text-6xl', lg: 'text-8xl' };
// Emoji fallback: pose only changes the animation class.
const POSE: Partial<Record<MascotPose, string>> = {
  greet: 'nx-pop', cheer: 'nx-wiggle', think: '-rotate-6', rest: 'opacity-80', curious: 'rotate-6', amazed: 'nx-heart',
  happy: 'nx-mascot-happy', sad: 'nx-mascot-sad',
};
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
  /** Owl only: where the eyes look, -1..1. Default: follows the pointer and focus. */
  look?: { x: number; y: number };
  /** Hide from screen readers when the mascot sits beside text that says the same thing. */
  decorative?: boolean;
  /** Overrides `appConfig.mascot`. Used by stories. */
  config?: MascotConfig;
  className?: string;
};

/** Mascot of a given pose and size; picks the image or vector set from config. */
export function Mascot({ pose = 'greet', size = 'md', speaking, look, decorative, config, className }: MascotProps) {
  const cfg = config ?? appConfig.mascot;
  const t = useTranslations('game.mascot');
  const reduced = useReducedMotion();
  const owl = cfg.enabled && cfg.kind === 'owl';
  const [Numa, setNuma] = useState<ComponentType<NumaProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!owl) return;
    let live = true;
    import('./Numa').then((m) => live && setNuma(() => m.default)).catch((e) => {
      console.error('Mascot owl failed to load, using emoji.', e);
      if (live) setFailed(true);
    });
    return () => { live = false; };
  }, [owl]);
  useEffect(() => {
    if (cfg.enabled && cfg.kind !== 'emoji' && cfg.kind !== 'owl' && appConfig.env === 'development') {
      console.warn(`Mascot kind "${cfg.kind}" is not implemented yet, using emoji.`);
    }
  }, [cfg.enabled, cfg.kind]);
  if (!cfg.enabled) return null;
  if (owl && !failed) {
    const np = OWL[pose];
    const w = Math.round((PX[size] * 240) / 254);
    return (
      <span
        {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': t(`pose.${np}`) })}
        className={cn('inline-flex shrink-0', size !== 'sm' && 'max-sm:[--ms:.67]', className)}
        style={{ width: `calc(${w}px * var(--ms, 1))`, height: `calc(${PX[size]}px * var(--ms, 1))` }}
      >
        {Numa && <Numa pose={np} look={look} speaking={speaking} reduced={reduced} />}
      </span>
    );
  }
  const emoji = emojiAdapter(cfg.emoji);
  return (
    <span aria-hidden className={cn('inline-flex shrink-0', pose !== 'rest' && pose !== 'happy' && pose !== 'sad' && 'nx-float', className)}>
      <span className={cn('inline-flex', speaking && pose !== 'happy' && pose !== 'sad' && 'nx-pulse', !speaking && (pose === 'greet' || pose === 'curious') && 'nx-tilt')}>
        {pose === 'happy' || pose === 'sad' ? <Reaction name={pose} size={PX.md / 2} /> : emoji.render(pose, size)}
      </span>
    </span>
  );
}
