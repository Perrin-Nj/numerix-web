'use client';
import type { ReactNode } from 'react';
import { setApiMode, type ApiMode as Mode } from '@/lib/api/client';

/** Tells the API client which cookie (parent or child token) the proxy should use for this area. */
export function ApiMode({ mode, children }: { mode: Mode; children: ReactNode }) {
  setApiMode(mode);
  return <>{children}</>;
}
