// Bear Den Coach HQ — Service Worker
// Enables offline support by caching the app shell

const CACHE_NAME = 'bear-den-coach-hq-v3';
const ASSETS = [
  './',
  './index.html',
  './app.html',
  './pricing.html',
  './auth.html',
  './onboarding.html',
  './account.html',
  './privacy.html',
  './terms.html',
  './site.css',
  './site.js',
  './manifest.json',
  './data/drills.js',
  './components/rink.js',
  './components/diagram.js',
  './components/editor.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
];

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        // If external font fails, still cache the rest
        console.warn('Partial cache:', err);
        return Promise.all(
          ASSETS.map((url) =>
            cache.add(url).catch(() => console.warn('Failed:', url))
          )
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first for HTML (to get updates), cache first for assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if (req.method !== 'GET') return;

  // For HTML: try network first, fall back to cache
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./app.html') || caches.match('./index.html')))
    );
    return;
  }

  // For everything else: cache first, fall back to network
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          // Only cache successful same-origin responses
          if (res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
      );
    })
  );
});
