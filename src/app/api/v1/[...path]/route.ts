import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/config/env';
import { appConfig } from '@/config/app';

/**
 * Same-origin proxy to the backend (WireMock locally, FastAPI later).
 * - Tokens live in httpOnly cookies; the browser never reads them.
 * - Auth responses set the cookies and have their tokens stripped from the body.
 * - A 401 on a parent call triggers one silent refresh and retry.
 */

const COOKIE = { parent: 'nx_parent', refresh: 'nx_refresh', child: 'nx_child', childId: 'nx_child_id' } as const;
const secure = process.env.NODE_ENV === 'production';

type Ctx = { params: Promise<{ path: string[] }> };

function cookieOpts(maxAge: number, httpOnly = true) {
  return { httpOnly, secure, sameSite: 'lax' as const, path: '/', maxAge };
}

async function forward(req: NextRequest, upstream: string, token: string | undefined) {
  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'idempotency-key', 'last-event-id']) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  const locale = req.cookies.get('NEXT_LOCALE')?.value ?? req.headers.get('accept-language');
  if (locale) headers.set('accept-language', locale);
  if (token) headers.set('authorization', `Bearer ${token}`);
  const scenario = appConfig.useMock ? req.cookies.get('nx_mock_scenario')?.value : undefined;
  if (scenario) headers.set('x-mock-scenario', scenario);
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  return fetch(upstream, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: 'no-store',
    redirect: 'manual',
  });
}

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const joined = path.join('/');
  const base = serverEnv().API_URL.replace(/\/$/, '');
  const upstream = `${base}/${joined}${req.nextUrl.search}`;
  const mode = req.headers.get('x-nx-mode') === 'child' ? 'child' : 'parent';
  const jar = req.cookies;
  const isAuth = /^auth\/(login|register|refresh)$/.test(joined);
  const isChildToken = /^children\/[^/]+\/token$/.test(joined);

  let token = isAuth ? undefined : mode === 'child' ? jar.get(COOKIE.child)?.value : jar.get(COOKIE.parent)?.value;
  let refreshed: { access: string; refresh: string; expires: number } | null = null;

  let res: Response;
  try {
    res = await forward(req, upstream, token);
  } catch {
    return NextResponse.json(
      { type: 'about:blank', title: 'Backend unreachable', status: 502, code: 'network', detail: 'The server did not answer.' },
      { status: 502, headers: { 'content-type': 'application/problem+json' } },
    );
  }

  // Silent refresh for an expired parent session
  if (res.status === 401 && !isAuth && mode === 'parent' && jar.get(COOKIE.refresh)?.value) {
    const r = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: jar.get(COOKIE.refresh)!.value }),
      cache: 'no-store',
    }).catch(() => null);
    if (r?.ok) {
      const j = (await r.json()) as { access_token: string; refresh_token: string; expires_in: number };
      refreshed = { access: j.access_token, refresh: j.refresh_token, expires: j.expires_in };
      token = j.access_token;
      res = await forward(req, upstream, token);
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  const outHeaders = new Headers();
  for (const name of ['content-type', 'cache-control']) {
    const v = res.headers.get(name);
    if (v) outHeaders.set(name, v);
  }
  if (contentType.includes('text/event-stream')) {
    outHeaders.set('cache-control', 'no-cache, no-transform');
    outHeaders.set('x-accel-buffering', 'no');
    return new NextResponse(res.body, { status: res.status, headers: outHeaders });
  }

  // Auth endpoints: move tokens into httpOnly cookies and strip them from the body
  if (res.ok && (isAuth || isChildToken) && contentType.includes('json')) {
    const body = (await res.json()) as Record<string, unknown>;
    const expires = Number(body.expires_in ?? 3600);
    const access = String(body.access_token);
    const refresh = String(body.refresh_token);
    const childId = (body.child as { id?: string } | undefined)?.id;
    delete body.access_token;
    delete body.refresh_token;
    const out = NextResponse.json(body, { status: res.status });
    if (isAuth) {
      out.cookies.set(COOKIE.parent, access, cookieOpts(expires));
      out.cookies.set(COOKIE.refresh, refresh, cookieOpts(60 * 60 * 24 * 30));
    } else {
      out.cookies.set(COOKIE.child, access, cookieOpts(expires));
      if (childId) out.cookies.set(COOKIE.childId, childId, cookieOpts(expires, false));
    }
    return out;
  }

  const out = new NextResponse(res.status === 204 || res.status === 202 ? null : res.body, { status: res.status, headers: outHeaders });
  if (refreshed) {
    out.cookies.set(COOKIE.parent, refreshed.access, cookieOpts(refreshed.expires));
    out.cookies.set(COOKIE.refresh, refreshed.refresh, cookieOpts(60 * 60 * 24 * 30));
  }
  return out;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
