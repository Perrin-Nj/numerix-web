'use client';
import { useState, type ReactNode } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { appConfig } from '@/config/app';
import { AudioProvider } from '@/lib/audio';
import { reportError } from '@/lib/errors/bridge';
import { ThemeProvider, type DisplayMode, type ThemeChoice } from '@/lib/theme';
import { ErrorBridge } from '@/features/common/ErrorBridge';
import { PwaManager } from '@/features/common/PwaManager';
import { NotificationCenter, useNotify } from '@/ui/notification-center';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
    // Every failed request is shown to the user, unless a screen already handles that error explicitly
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!query.meta?.handled) reportError(error, { retry: () => void query.fetch() });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (!mutation.meta?.handled) reportError(error);
      },
    }),
  });
}

function AudioWithNotice({ children }: { children: ReactNode }) {
  const t = useTranslations('errors.sound');
  const { notify } = useNotify();
  return (
    <AudioProvider
      defaultEnabled={appConfig.defaults.sound}
      onError={() => notify({ id: 'sound-failed', kind: 'warning', title: t('title'), description: t('description') })}
    >
      {children}
    </AudioProvider>
  );
}

export function Providers({
  children,
  theme,
  reducedMotion,
  display,
}: {
  children: ReactNode;
  theme: ThemeChoice;
  reducedMotion: boolean;
  display: DisplayMode;
}) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider initialTheme={theme} initialReducedMotion={reducedMotion} initialDisplay={display}>
        <AudioWithNotice>
          {children}
          <NotificationCenter />
          <ErrorBridge />
          <PwaManager />
        </AudioWithNotice>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
