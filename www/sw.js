// Increment cache name on releases so browser updates JS/HTML reliably.
// NOTE: Keep this monotonic to force SW updates on hotfixes.
const CACHE_NAME = 'nexowatt-cache-v79';

const OFFLINE_URLS = [
  './',
  'index.html',
  'assets/icons/nexowatt-192.png',
  'assets/icons/nexowatt-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // IMPORTANT: Never intercept non-GET requests.
  // Otherwise browsers can throw "Failed to fetch" (e.g. POST bodies) and App-Center saving breaks.
  if (req.method && req.method !== 'GET') return;

  const url = new URL(req.url);

  // Do not intercept Server-Sent Events streams (keeps them stable)
  if (url.pathname === '/events' || url.pathname.startsWith('/events')) return;

  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '/index.html';
  const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/state') || url.pathname.startsWith('/sse') || url.pathname === '/config';

  if (isCode) {
    event.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return r;
        })
        .catch(() => {
          // Offline fallback: serve cached file, or fall back to index.html.
          return caches.match(req).then((cached) => cached || caches.match('index.html'));
        })
    );
    return;
  }

  if (isApi) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => {
        // API should be network-first; fallback to cache if available.
        return caches.match(req).then((cached) => cached || new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((resp) => resp || fetch(req))
  );
});
