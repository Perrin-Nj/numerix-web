'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { appConfig } from '@/config/app';
import { Mascot, type MascotConfig, type MascotPose, type MascotSize } from '@/game/mascot';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';

export type MascotBubbleProps = {
  pose?: MascotPose;
  size?: MascotSize;
  children: ReactNode;
  /** Overrides `appConfig.mascot`. Used by stories. */
  config?: MascotConfig;
  className?: string;
};

const TEXT: Record<MascotSize, string> = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };

/** Speech bubble. With the mascot disabled it is just the bubble, no empty slot. */
export function MascotBubble({ pose = 'greet', size = 'md', children, config, className }: MascotBubbleProps) {
  const cfg = config ?? appConfig.mascot;
  const { play } = useSound();
  const last = useRef<MascotPose | null>(null);
  useEffect(() => {
    if (pose === 'think' && last.current !== 'think') play('question');
    last.current = pose;
  }, [pose, play]);
  return (
    <div className={cn('flex items-end gap-3', className)}>
      <Mascot pose={pose} size={size} config={cfg} speaking />
      <div
        className={cn(
          'relative min-w-0 rounded-lg border-2 border-line bg-elevated px-4 py-3 font-display text-fg shadow-1',
          TEXT[size],
        )}
      >
        {cfg.enabled && (
          <span aria-hidden className="absolute -left-2 bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-line bg-elevated" />
        )}
        {children}
      </div>
    </div>
  );
}
