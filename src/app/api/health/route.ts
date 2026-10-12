import { NextResponse } from 'next/server';
import { serverEnv } from '@/config/env';

/**
 * Tells the browser which side is down when a request fails. If this answers, the app is reachable;
 * `backend` then says whether the API behind it is.
 */
export async function GET() {
  let backend: 'ok' | 'timeout' | 'unreachable' | 'error' = 'unreachable';
  try {
    const res = await fetch(`${serverEnv().API_URL.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    backend = res.ok ? 'ok' : 'error';
  } catch (e) {
    backend = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'timeout' : 'unreachable';
  }
  return NextResponse.json({ app: 'ok', backend }, { headers: { 'cache-control': 'no-store' } });
}
