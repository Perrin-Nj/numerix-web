'use client';
/** Who is signed in on this device, and sign out. */
import { clearLocalState } from '@/data/session/clear';
import { useQuery } from '@tanstack/react-query';
import { keys } from './keys';

export type SessionStatus = { parent: boolean; child: boolean; childId: string | null };

/**
 * Query for GET /api/session: which roles (parent, child) are signed in on this device and the active child id.
 * Read server-side because the cookies are httpOnly; fresh for 5 s.
 */
export function useSessionStatus() {
  return useQuery({
    queryKey: keys.session,
    queryFn: async (): Promise<SessionStatus> => {
      const res = await fetch('/api/session', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not read session status');
      return res.json();
    },
    staleTime: 5_000,
  });
}

/**
 * Ends the session through DELETE /api/session, then clears on-device state and tells the service worker to drop
 * cached data. scope 'child' switches player, 'all' signs the parent out too. Throws if the server call fails.
 */
export async function signOut(scope: 'child' | 'all') {
  const res = await fetch(`/api/session?scope=${scope}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Sign out failed');
  // forget cached child data on this device
  clearLocalState(scope);
  if ('serviceWorker' in navigator) navigator.serviceWorker.controller?.postMessage('CLEAR_DATA');
}
