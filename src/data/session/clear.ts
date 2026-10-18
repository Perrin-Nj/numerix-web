'use client';
import type { QueryClient } from '@tanstack/react-query';
import { DEFAULT_PREFS, usePrefs } from '@/platform/prefs/store';

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
 * - 'child' (change who plays): memory only, so nothing of the last player stays on screen. Progress lives on the server.
 * - 'all' (grown-up signs out): everything under `nx:` goes. Kept: language (cookie)
 *   and the theme, which are device settings, not account state.
 */
export function clearLocalState(scope: 'child' | 'all') {
  try {
    window.speechSynthesis?.cancel();
    sessionStorage.clear();
  } catch {
    /* storage can be blocked */
  }
  client?.clear();
  if (scope !== 'all') return;
  usePrefs.setState({ ...DEFAULT_PREFS });
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('nx:'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage can be blocked */
  }
}
