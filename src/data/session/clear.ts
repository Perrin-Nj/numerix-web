'use client';
import { appConfig } from '@/config/app';
import type { QueryClient } from '@tanstack/react-query';
import { useGameStore } from '@/data/local/store';
import { DEFAULT_PREFS, usePrefs } from '@/platform/prefs/store';

/** The demo platform finds the parent's subscription by email (the proxy adds a header). A real backend uses the token. */
export function rememberParentEmail(email: string) {
  if (!appConfig.useMock) return;
  document.cookie = `nx_parent_email=${encodeURIComponent(email.toLowerCase())}; path=/; max-age=31536000; samesite=lax`;
}

let client: QueryClient | null = null;
/**
 * Gives clearLocalState the app's QueryClient so it can drop cached server data on sign out. Call once when the
 * provider is created.
 */
export const registerQueryClient = (qc: QueryClient) => {
  client = qc;
};

/**
 * Frees what the device remembers.
 * - 'child' (change who plays): memory only, so nothing of the last player stays on screen. Each child's
 *   own on-device progress is kept for when they come back (the server owns it once BE-21 exists).
 * - 'all' (grown-up signs out): everything under `nx:` goes, progress included. Kept: language (cookie)
 *   and the theme, which are device settings, not account state.
 */
export function clearLocalState(scope: 'child' | 'all') {
  try {
    window.speechSynthesis?.cancel();
    sessionStorage.clear();
  } catch {
    /* storage can be blocked */
  }
  useGameStore.setState({ queue: [] });
  client?.clear();
  if (scope !== 'all') return;
  document.cookie = 'nx_parent_email=; path=/; max-age=0';
  useGameStore.setState({ byChild: {} });
  usePrefs.setState({ ...DEFAULT_PREFS });
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('nx:'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage can be blocked */
  }
}
