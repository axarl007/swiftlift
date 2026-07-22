// Swiftlift service worker — cache-first for app shell, network-first for thumbnails
const CACHE = 'swiftlift-v15';
const APP_SHELL = [
  './Swiftlift.html',
  './store.js?v=15',
  './utils.js?v=15',
  './data.js?v=15',
  './suggestion-engine.js?v=15',
  './csv-parser.js?v=15',
  './json-backup.js?v=15',
  './meal-planner.jsx?v=15',
  './circuit.jsx?v=15',
  './tabs.jsx?v=15',
  './log.jsx?v=15',
  './app.jsx?v=15',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // YouTube thumbnails — network first, fall back to cache
  if (url.hostname === 'i.ytimg.com') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // CDN resources (React, Tailwind, Babel, Fonts) — cache first
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        });
      })
    );
    return;
  }

  // App shell — cache first (exact URL match including ?v= query string)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
