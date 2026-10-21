// Pings the deployed projects so the first real request is never a cold start.
// Usage: KEEPALIVE_URLS="https://app.example.ca/api/health" node scripts/keepalive.mjs
const urls = (process.env.KEEPALIVE_URLS ?? '').trim().split(/\s+/).filter(Boolean);
if (urls.length === 0) {
  console.log('KEEPALIVE_URLS is empty; no health URLs configured.');
  process.exit(0);
}

let down = 0;
for (const url of urls) {
  const t = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
    console.log(`${res.ok ? 'up  ' : 'DOWN'} ${res.status} ${Date.now() - t}ms ${url}`);
    if (!res.ok) down++;
  } catch (e) {
    console.log(`DOWN ${e.name} ${url}`);
    down++;
  }
}
process.exit(down ? 1 : 0);
