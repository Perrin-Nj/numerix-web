'use client';
import { useState, type ReactNode } from 'react';
import { setApiMode, type ApiMode as Mode } from '@/data/api/client';

/**
 * Tells the API client which cookie (parent or child token) the proxy should use for this area.
 * Set once, when the area first renders. A page that is being left can render again after the next page set its
 * own mode (the profile picker is parent mode, the home is child mode), and that late render must not win.
 */
export function ApiMode({ mode, children }: { mode: Mode; children: ReactNode }) {
  useState(() => setApiMode(mode));
  return <>{children}</>;
}
