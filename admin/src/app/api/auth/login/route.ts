import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { COOKIE, SESSION_SECONDS, makeToken, safeEqual } from '@/lib/session';
import { blockedFor, clear, fail } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let e;
  try {
    e = env();
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const wait = blockedFor(ip);
  if (wait) {
    return NextResponse.json({ message: 'too_many_attempts', retry_after: wait }, { status: 429, headers: { 'Retry-After': String(wait) } });
  }
  const body = (await req.json().catch(() => null)) as { password?: unknown; actor?: unknown } | null;
  const pw = typeof body?.password === 'string' ? body.password : '';
  if (!pw || !safeEqual(pw, e.ADMIN_PASSWORD)) {
    fail(ip);
    return NextResponse.json({ message: 'invalid_credentials' }, { status: 401 });
  }
  clear(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(typeof body?.actor === 'string' ? body.actor : undefined), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
  return res;
}
