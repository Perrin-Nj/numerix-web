import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { COOKIE, verifyToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

const FILE = /^[A-Za-z0-9_]+(-\d{2,4})?\.webp$/;

/** Image bytes for the asset browser and picker. The platform serves /v1/assets/{file} publicly; this keeps the admin origin as the only one the browser talks to. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  if (!verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  const { file } = await ctx.params;
  if (!FILE.test(file)) return NextResponse.json({ message: 'bad_path' }, { status: 400 });
  try {
    const up = await fetch(`${env().PLATFORM_API_URL.replace(/\/$/, '')}/v1/assets/${file}`, { signal: AbortSignal.timeout(15000) });
    if (!up.ok) return NextResponse.json({ message: 'not_found' }, { status: up.status === 404 ? 404 : 502 });
    return new NextResponse(await up.arrayBuffer(), { headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=86400' } });
  } catch {
    return NextResponse.json({ message: 'platform_unreachable' }, { status: 502 });
  }
}
