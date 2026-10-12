import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/config/env';
import { appConfig } from '@/config/app';

/**
 * Same-origin proxy to the backend (WireMock locally, FastAPI later).
 * - Tokens live in httpOnly cookies; the browser never reads them.
 * - Auth responses set the cookies and have their tokens stripped from the body.
 * - A 401 on a parent call triggers one silent refresh and retry.
 */

const MOCK_STATE_COOKIE = 'nx_mock_state';
const COOKIE = { parent: 'nx_parent', refresh: 'nx_refresh', child: 'nx_child', childId: 'nx_child_id' } as const;
const secure = process.env.NODE_ENV === 'production';

type Ctx = { params: Promise<{ path: string[] }> };
const UPSTREAM_TIMEOUT_MS = 15_000;

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
  if (appConfig.useMock) {
    headers.set('x-card-threshold-pct', String(appConfig.cardThresholdPct));
    const email = req.cookies.get('nx_parent_email')?.value;
    if (email) headers.set('x-mock-parent-email', decodeURIComponent(email));
    const scenario = req.cookies.get('nx_mock_scenario')?.value;
    if (scenario) headers.set('x-mock-scenario', scenario);
    // The serverless mock keeps its scenario state with the client
    const mockState = req.cookies.get(MOCK_STATE_COOKIE)?.value;
    if (mockState) headers.set('x-mock-state', mockState);
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  return fetch(upstream, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json({ type: 'about:blank', title, status, code, detail }, { status, headers: { 'content-type': 'application/problem+json' } });
}

/** Carry the mock's scenario state back to the browser (mock mode only). */
function keepMockState(out: NextResponse, upstream: Response) {
  const state = upstream.headers.get('x-mock-state');
  if (appConfig.useMock && state) out.cookies.set(MOCK_STATE_COOKIE, state, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 });
  return out;
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
  } catch (e) {
    // This app answered, but its backend did not: the problem is on our side, and we say which kind
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return timedOut
      ? problem(504, 'backend_timeout', 'Backend timeout', 'The backend did not answer in time.')
      : problem(502, 'backend_unreachable', 'Backend unreachable', 'The backend could not be reached.');
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

  // A gateway error without a problem body (HTML from a proxy, an empty reply) means the backend itself did not answer
  if ([502, 503, 504].includes(res.status) && !contentType.includes('json')) {
    return res.status === 504
      ? problem(504, 'backend_timeout', 'Backend timeout', 'The backend did not answer in time.')
      : problem(502, 'backend_unreachable', 'Backend unreachable', 'The backend could not be reached.');
  }
  const outHeaders = new Headers();
  for (const name of ['content-type', 'cache-control']) {
    const v = res.headers.get(name);
    if (v) outHeaders.set(name, v);
  }
  if (contentType.includes('text/event-stream')) {
    outHeaders.set('cache-control', 'no-cache, no-transform');
    outHeaders.set('x-accel-buffering', 'no');
    return keepMockState(new NextResponse(res.body, { status: res.status, headers: outHeaders }), res);
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
    return keepMockState(out, res);
  }

  const out = new NextResponse(res.status === 204 || res.status === 202 ? null : res.body, { status: res.status, headers: outHeaders });
  if (refreshed) {
    out.cookies.set(COOKIE.parent, refreshed.access, cookieOpts(refreshed.expires));
    out.cookies.set(COOKIE.refresh, refreshed.refresh, cookieOpts(60 * 60 * 24 * 30));
  }
  return keepMockState(out, res);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
