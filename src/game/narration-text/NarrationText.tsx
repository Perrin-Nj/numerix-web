'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/cn';
import { useSound } from '@/platform/audio';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type NarrationStatus = 'pending' | 'streaming' | 'ready' | 'fallback';

export type NarrationTextProps = {
  text: string | null;
  status: NarrationStatus;
  slow?: boolean;
  onRetry?: () => void;
  className?: string;
};

export function NarrationText({ text, status, slow, onRetry, className }: NarrationTextProps) {
  const t = useTranslations('game.narrationText');
  const { play } = useSound();
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === 'streaming' && status === 'ready') play('tick');
    prev.current = status;
  }, [status, play]);
  const waiting = status === 'pending' && !text;
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {waiting ? (
        <div role="status" aria-label={t('loading')} className="flex flex-col gap-3">
          <div className="nx-skeleton h-6 w-full rounded-sm" />
          <div className="nx-skeleton h-6 w-11/12 rounded-sm" />
          <div className="nx-skeleton h-6 w-2/3 rounded-sm" />
        </div>
      ) : (
        <p
          aria-live="polite"
          aria-busy={status === 'streaming'}
          className="font-display text-xl leading-relaxed text-fg md:text-2xl"
        >
          {text}
          {status === 'streaming' && (
            <span aria-hidden className="ml-1 inline-block h-5 w-1 animate-pulse bg-brand align-middle motion-reduce:animate-none" />
          )}
        </p>
      )}
      {slow && waiting && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-md bg-brand-soft p-3 text-fg">
          <span>{t('slow')}</span>
          {onRetry && (
            <Button variant="secondary" size="sm" iconLeft={<Icon name="refresh" />} onClick={onRetry}>
              {t('retry')}
            </Button>
          )}
        </div>
      )}
      {status === 'fallback' && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Icon name="info" size={16} />
          {t('fallback')}
        </p>
      )}
    </div>
  );
}
