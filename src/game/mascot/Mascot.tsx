'use client';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import type { LottieMode } from './LottieRabbit';
import { appConfig, type MascotKind } from '@/config/app';
import { cn } from '@/shared/cn';
import { Reaction } from '@/game/reaction';

export type MascotPose = 'greet' | 'cheer' | 'think' | 'rest' | 'curious' | 'amazed' | 'happy' | 'sad';
export type MascotSize = 'sm' | 'md' | 'lg';
export type MascotConfig = { enabled: boolean; kind: MascotKind; emoji: string; src: string };

/** One small interface so image, lottie and rive sets can plug in later. */
export interface MascotAdapter {
  render(pose: MascotPose, size: MascotSize): ReactNode;
}

// One animation only (rabbit with a balloon): poses differ by speed and frame, never by fake art.
// More poses need more .lottie files, see LICENSES.md.
const LOTTIE: Record<MascotPose, LottieMode> = {
  greet: { speed: 0.6, frame: 'play' },
  rest: { speed: 0.6, frame: 'play' },
  curious: { speed: 0.6, frame: 'play' },
  cheer: { speed: 1, frame: 'play' },
  amazed: { speed: 1.4, frame: 'play' },
  happy: { speed: 1.4, frame: 'play' },
  think: { speed: 1, frame: 'mid' },
  sad: { speed: 1, frame: 'first' },
};
const DEFAULT_LOTTIE = '/mascot/rabbit-balloon.lottie';

const PX: Record<MascotSize, number> = { sm: 40, md: 64, lg: 96 };
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

type RabbitProps = { src: string; mode: LottieMode; px: number; onError: () => void };
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
  const t = useTranslations('game.mascot');
  const reduced = useReducedMotion();
  const lottie = cfg.enabled && cfg.kind === 'lottie';
  const [Rabbit, setRabbit] = useState<ComponentType<RabbitProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!lottie) return;
    let live = true;
    import('./LottieRabbit').then((m) => live && setRabbit(() => m.default)).catch((e) => {
      console.error('Mascot animation failed to load, using emoji.', e);
      if (live) setFailed(true);
    });
    return () => { live = false; };
  }, [lottie]);
  useEffect(() => {
    if (cfg.enabled && cfg.kind !== 'emoji' && cfg.kind !== 'lottie' && appConfig.env === 'development') {
      console.warn(`Mascot kind "${cfg.kind}" is not implemented yet, using emoji.`);
    }
  }, [cfg.enabled, cfg.kind]);
  if (!cfg.enabled) return null;
  const emoji = emojiAdapter(cfg.emoji);
  if (lottie && !failed) {
    const mode: LottieMode = reduced ? { speed: 1, frame: 'first' } : LOTTIE[pose];
    const onError = () => { console.error('Mascot animation file could not be read, using emoji.'); setFailed(true); };
    return (
      <span role="img" aria-label={t('label')} className={cn('inline-flex shrink-0 transition', pose === 'sad' && '-rotate-3 opacity-70 saturate-50', className)} style={{ width: PX[size], height: PX[size] }}>
        {Rabbit && <Rabbit src={cfg.src || DEFAULT_LOTTIE} mode={mode} px={PX[size]} onError={onError} />}
      </span>
    );
  }
  return (
    <span aria-hidden className={cn('inline-flex shrink-0', pose !== 'rest' && pose !== 'happy' && pose !== 'sad' && 'nx-float', className)}>
      <span className={cn('inline-flex', speaking && pose !== 'happy' && pose !== 'sad' && 'nx-pulse', !speaking && (pose === 'greet' || pose === 'curious') && 'nx-tilt')}>
        {pose === 'happy' || pose === 'sad' ? <Reaction name={pose} size={PX[size]} /> : emoji.render(pose, size)}
      </span>
    </span>
  );
}
