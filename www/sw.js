// Increment cache name on releases so browser updates JS/HTML reliably.
const CACHE_NAME = 'nexowatt-cache-v10';
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
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname === '/';
  const isApi  = url.pathname.startsWith('/api/') || url.pathname === '/events' || url.pathname.startsWith('/state') || url.pathname.startsWith('/sse');

  if (isCode) {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (isApi) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(caches.match(req).then(resp => resp || fetch(req)));
});