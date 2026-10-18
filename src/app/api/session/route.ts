import { NextRequest, NextResponse } from 'next/server';

/** Tells the client which sessions exist (cookies are httpOnly) and lets it sign out. */
export async function GET(req: NextRequest) {
  const jar = req.cookies;
  return NextResponse.json(
    {
      parent: Boolean(jar.get('nx_parent')?.value || jar.get('nx_refresh')?.value),
      child: Boolean(jar.get('nx_child')?.value),
      childId: jar.get('nx_child_id')?.value ?? null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function DELETE(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get('scope');
  const scope = asked === 'child' || asked === 'parent' ? asked : 'all';
  const res = new NextResponse(null, { status: 204 });
  // 'parent' ends a dead session but keeps the known-device cookie, so the login screen can reopen the app by itself
  const names =
    scope === 'child' ? ['nx_child', 'nx_child_id'] : scope === 'parent' ? ['nx_parent', 'nx_refresh', 'nx_child', 'nx_child_id'] : ['nx_parent', 'nx_refresh', 'nx_child', 'nx_child_id', 'nx_device'];
  for (const n of names) res.cookies.set(n, '', { path: '/', maxAge: 0 });
  return res;
}
