'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorPanel, type ErrorArea } from '@/ui/error-screen';

export type ScreenPhase = 'loading' | 'slow' | 'error' | 'empty' | 'ready';

type StateInput = { isLoading: boolean; error?: unknown; isEmpty?: boolean; timeoutMs?: number };

/** A screen is never idle: loading turns into "slow" after timeoutMs, errors and empty are explicit. */
export function useScreenState({ isLoading, error, isEmpty = false, timeoutMs = 8000 }: StateInput): ScreenPhase {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const id = setTimeout(() => setSlow(true), timeoutMs);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [isLoading, timeoutMs]);
  if (error) return 'error';
  if (isLoading) return slow ? 'slow' : 'loading';
  return isEmpty ? 'empty' : 'ready';
}

export type ScreenStateProps = StateInput & {
  /** Shown while loading, before the slow panel. */
  skeleton: ReactNode;
  /** Custom empty state. Defaults to a friendly panel with a way home. */
  empty?: ReactNode;
  onRetry?: () => void;
  area?: ErrorArea;
  children: ReactNode;
};

export function ScreenState({ skeleton, empty, onRetry, area, children, ...input }: ScreenStateProps) {
  const t = useTranslations('screenState');
  const phase = useScreenState(input);
  if (phase === 'error') return <ErrorPanel error={input.error} area={area} onRetry={onRetry} />;
  if (phase === 'slow') {
    return <ErrorPanel kind="timeout" code="backend_timeout" calm hideDetails area={area} onRetry={onRetry} title={t('slow.title')} description={t('slow.description')} />;
  }
  if (phase === 'loading') {
    return (
      <div role="status" aria-busy="true" aria-label={t('loading')}>
        {skeleton}
      </div>
    );
  }
  if (phase === 'empty') {
    return empty ?? <ErrorPanel kind="notfound" code="not_found" calm hideDetails area={area} title={t('empty.title')} description={t('empty.description')} />;
  }
  return <>{children}</>;
}
