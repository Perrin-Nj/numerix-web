'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUI } from '@/lib/store';
import { Toaster } from './ui';

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } } }));
  useEffect(() => {
    // Sync store from what the head script / storage already decided.
    let l: string | null = null;
    try {
      l = localStorage.getItem('nx_locale');
    } catch {
      l = null;
    }
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    useUI.setState({ theme, ...(l === 'en' || l === 'fr' ? { locale: l } : {}) });
  }, []);
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
