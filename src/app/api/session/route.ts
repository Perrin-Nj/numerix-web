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
  const scope = req.nextUrl.searchParams.get('scope') === 'child' ? 'child' : 'all';
  const res = new NextResponse(null, { status: 204 });
  const names = scope === 'child' ? ['nx_child', 'nx_child_id'] : ['nx_parent', 'nx_refresh', 'nx_child', 'nx_child_id', 'nx_mock_state', 'nx_mock_scenario'];
  for (const n of names) res.cookies.set(n, '', { path: '/', maxAge: 0 });
  return res;
}
