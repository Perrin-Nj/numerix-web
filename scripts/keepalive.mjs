// Pings the deployed projects so the first real request is never a cold start.
// Usage: node scripts/keepalive.mjs [url ...]   (defaults to the app health route)
const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['https://numerix-web-snowy.vercel.app/api/health'];

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
