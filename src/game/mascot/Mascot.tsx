'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from '@/platform/motion';
import type { NumaPose, NumaProps } from './Numa';
import { appConfig, type MascotKind } from '@/config/app';
import { cn } from '@/shared/cn';

export type MascotPose =
  | 'greet' | 'cheer' | 'think' | 'rest' | 'curious' | 'amazed' | 'happy' | 'sad'
  | 'idle' | 'wave' | 'sleepy';
export type MascotSize = 'sm' | 'md' | 'lg';
export type MascotConfig = { enabled: boolean; kind: MascotKind; src?: string };

// Old pose names keep working: they map onto the six poses of Numa.
const OWL: Record<MascotPose, NumaPose> = {
  greet: 'wave', wave: 'wave', rest: 'idle', idle: 'idle', curious: 'think', think: 'think',
  cheer: 'cheer', amazed: 'cheer', happy: 'cheer', sad: 'sad', sleepy: 'sleepy',
};

// Height in px: small 48, medium 120, hero 240 (two thirds of that on phones, so a bubble never overflows).
const PX: Record<MascotSize, number> = { sm: 48, md: 120, lg: 240 };
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
      console.error('Mascot owl failed to load.', e);
      if (live) setFailed(true);
    });
    return () => { live = false; };
  }, [owl]);
  useEffect(() => {
    if (cfg.enabled && cfg.kind !== 'owl' && appConfig.env === 'development') {
      console.warn(`Mascot kind "${cfg.kind}" is not implemented yet, Numa stays hidden.`);
    }
  }, [cfg.enabled, cfg.kind]);
  if (!cfg.enabled) return null;
  if (owl && !failed) {
    const np = OWL[pose];
    const w = Math.round((PX[size] * 240) / 254);
    return (
      <span
        data-mascot="numa"
        {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': t(`pose.${np}`) })}
        className={cn('inline-flex shrink-0', size !== 'sm' && 'max-sm:[--ms:.67]', className)}
        style={{ width: `calc(${w}px * var(--ms, 1))`, height: `calc(${PX[size]}px * var(--ms, 1))` }}
      >
        {Numa && <Numa pose={np} look={look} speaking={speaking} reduced={reduced} />}
      </span>
    );
  }
  // Numa is the only character: if she cannot load, show nothing rather than a stand-in
  return null;
}
