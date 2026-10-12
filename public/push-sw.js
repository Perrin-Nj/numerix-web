/* Push handler, loaded by public/sw.js with importScripts('/push-sw.js').
   Real background push needs a sender service with VAPID keys and POST /v1/push/subscribe (BE-26).
   Until then this file is inert: no push event ever arrives. Payload (JSON): { title, body, url?, tag? }. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Plain text payload: show it as the body instead of dropping the message
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Numerix', {
      body: data.body || '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      data: { url: data.url || '/parent' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Same-origin paths only, so a payload can never send the user elsewhere
  const raw = (event.notification.data && event.notification.data.url) || '/parent';
  const target = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/parent';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) {
          w.navigate(target);
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
