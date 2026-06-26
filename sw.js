const CACHE = 'taskflow-v1';
const SHELL = [
  '/taskflow/',
  '/taskflow/index.html',
  '/taskflow/manifest.json',
  '/taskflow/icon-192.png',
  '/taskflow/icon-512.png',
  '/taskflow/icon.svg',
];

/* Install: cache the app shell immediately */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* Activate: drop old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Files that must never be cached (credentials, auth modules) */
const NO_CACHE = [
  '/taskflow/firebase-config.js',
  '/taskflow/auth.js',
];

/* Fetch: cache-first for shell assets, network-first for everything else */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Skip non-GET and cross-origin (weather API, Firebase CDN, etc.) */
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  /* Never serve auth / config files from cache */
  if (NO_CACHE.some(p => url.pathname === p)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(resp => {
        /* Cache successful same-origin responses */
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached || caches.match('/taskflow/'));
    })
  );
});

/* Background sync placeholder — tasks already persist in localStorage */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-tasks') {
    /* Future: sync to a backend here */
    console.log('[SW] Background sync:', e.tag);
  }
});
