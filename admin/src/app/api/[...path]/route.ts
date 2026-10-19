import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { COOKIE, verifyToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

const SEGMENT = /^[A-Za-z0-9_.~-]+$/;

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!verifyToken(req.cookies.get(COOKIE)?.value)) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }
  const { path } = await ctx.params;
  if (!path.every((s) => SEGMENT.test(s) && s !== '..' && s !== '.')) {
    return NextResponse.json({ message: 'bad_path' }, { status: 400 });
  }
  let e;
  try {
    e = env();
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
  const url = `${e.PLATFORM_API_URL.replace(/\/$/, '')}/admin/v1/${path.join('/')}${req.nextUrl.search}`;
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  try {
    const up = await fetch(url, {
      method: req.method,
      headers: {
        authorization: `Bearer ${e.ADMIN_API_TOKEN}`,
        accept: 'application/json',
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...(req.headers.get('if-match') ? { 'if-match': req.headers.get('if-match')! } : {}), // optimistic locking on question saves
      },
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const text = await up.text();
    return new NextResponse(text || null, {
      status: up.status,
      headers: { 'content-type': up.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'platform_unreachable' }, { status: 502 });
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
