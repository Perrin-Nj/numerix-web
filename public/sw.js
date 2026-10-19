/* Numerix service worker. Hand written on purpose: small, readable, no build step.
   - App shell and static assets: cache first.
   - Pages: network first, falling back to the offline page.
   - Read-only API data the child may browse offline (worlds, journey, collection, home): network first, cached copy as fallback.
   - Everything that changes state (answers, sessions, auth) is never cached or queued: grading needs the server. */
importScripts('/push-sw.js'); // push and notificationclick handlers (V4, BE-26)

const VERSION = 'nx-v1';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const DATA = `${VERSION}-data`;
const OFFLINE_URL = '/offline';
const REACTION_FILES = ['happy', 'sad', 'thinking', 'party', 'hug', 'thumbs-up', 'star-struck', 'pleading', 'sleepy', 'wave', 'clap', 'hearts'].map((n) => `/reactions/${n}.svg`);

const READABLE = /^\/api\/v1\/(worlds|credits|children\/[^/]+\/(journey|collection|home|engagement|growth))/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png', ...REACTION_FILES]))
      // Do not take over mid-session; the page asks for the update with SKIP_WAITING
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_DATA') caches.delete(DATA);
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (READABLE.test(url.pathname)) {
    event.respondWith(networkFirst(request, DATA));
    return;
  }
  if (url.pathname.startsWith('/api/')) return; // never cache the rest of the API

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, PAGES).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }
  if (/^\/(_next\/static|sounds|icons|assets)\//.test(url.pathname) || /\.(woff2?|png|svg|webm|mp3|webp)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
