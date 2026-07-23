/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/sw.ts
 * Quell-Hash: sha256:068572cfb4cd13efee5218acc1536f19f11d59383b7c2f421ef57c111197bdd2
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/sw.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/sw.js
 * Rolle im Projekt: Service Worker.
 * Zweck: Cache-Schicht für PWA/Offline-Shell; muss bei jeder Version gebumpt werden.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Service Worker/PWA-Cache: legt fest, welche UI-Dateien offline bzw. schneller geladen werden.
 * Zusammenhänge:
 * - Cache-Version muss bei jedem Frontend-Release erhöht werden.
 * - Greift auf Dateien aus www/ zu.
 * Wartungshinweise:
 * - Fehlerhafte Cache-Listen können alte UI-Dateien ausliefern; nach Änderungen immer Cache-Version erhöhen.
 */

// Increment cache name on releases so browser updates JS/HTML reliably.
// NOTE: Keep this monotonic to force SW updates on hotfixes.
const CACHE_NAME = 'nexowatt-cache-v441';

const OFFLINE_URLS = [
  './',
  'index.html',
  'storagefarm.html',
  'storagefarm.js',
  'dc-station-display.html',
  'dc-station-display.js',
  'dc-station-display.css',
  'energy-ledger.html',
  'energy-ledger.js',
  'mesh-microgrid.html',
  'mesh-microgrid.js',
  'admin-guard.js',
  'assets/icons/nexowatt-192.png',
  'assets/icons/nexowatt-512.png'
];

// Ereignis-Kommentar: Bindet das UI-Ereignis 'install' an self. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Ereignis-Kommentar: Bindet das UI-Ereignis 'activate' an self. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Ereignis-Kommentar: Bindet das UI-Ereignis 'fetch' an self. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
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
