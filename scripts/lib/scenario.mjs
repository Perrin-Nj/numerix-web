// Forces a failure on every /api/v1 call from the browser side (the real API cannot be told to fail).
// Usage: await scenario(ctx, 'server-error' | 'network-error' | 'rate-limited' | 'daily-limit' | null)
const REPLY = {
  'network-error': { status: 502, code: 'backend_unreachable', title: 'Backend unreachable' },
  'server-error': { status: 500, code: 'internal_error', title: 'Server error' },
  'rate-limited': { status: 429, code: 'rate_limited', title: 'Too many requests' },
  'daily-limit': { status: 429, code: 'daily_limit_reached', title: 'Daily limit reached' },
};
let active = null;
export async function scenario(ctx, value) {
  if (active) await ctx.unroute('**/api/v1/**', active);
  active = null;
  if (!value) return;
  active = (route) => {
    const r = REPLY[value];
    if (!r) return route.continue();
    return route.fulfill({
      status: r.status,
      contentType: 'application/problem+json',
      headers: r.status === 429 ? { 'retry-after': '1' } : {},
      body: JSON.stringify({ type: 'about:blank', title: r.title, status: r.status, code: r.code, detail: r.title }),
    });
  };
  await ctx.route('**/api/v1/**', active);
}
