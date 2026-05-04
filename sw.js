// BenchBoss Coach HQ — Service Worker v0.11.0
// Offline-first app shell and Bench Mode rink cache.

const CACHE_NAME = 'benchboss-app-shell-v11';
const RINK_CACHE_NAME = 'benchboss-rink-cache-v11';

const APP_SHELL = [
  './', './index.html', './app.html', './coach.html', './whiteboard.html', './bench.html', './bench-mode.html', './parent.html', './pricing.html', './auth.html', './onboarding.html', './account.html', './practice.html', './marketplace.html', './club.html', './youth-hockey-practice-plans.html', './animated-drills.html', './half-ice-practice-plans.html', './small-area-games.html', './seasonal-templates.html',
  './privacy.html', './terms.html', './refund.html', './contact.html', './runtime-config.js', './manifest.json', './site.css', './site.js',
  './assets/benchboss-logo.svg', './assets/benchboss-mark.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './components/rink.js', './components/diagram.js', './components/editor.js', './data/drills.js', './data/elite-drills.js', './data/elite-drills-pack-2.js', './data/elite-drills-pack-3.js',
  './src/features/app/app-state.js', './src/features/app/workspace-context.js', './src/features/auth/session.js', './src/features/auth/auth.js',
  './src/features/branding/team-branding.js', './src/features/dashboard/coach-dashboard.js', './src/features/practice/practice-engine.js',
  './src/features/practice/practice-ui.js', './src/features/practice/animated-drill-viewer.js', './src/features/practice/drill-media-tabs.js',
  './src/features/practice/ai-practice-builder.js', './src/features/practice/season-curriculum.js', './src/features/practice/drill-scoring.js',
  './src/features/practice/team-development-tracking.js', './src/features/bench/bench-mode.js', './src/features/bench/bench-standalone.js', './src/features/whiteboard/coach-whiteboard.js', './src/features/roster/roster.js',
  './src/features/game-day/game-day.js', './src/features/sharing/practice-sharing.js', './src/features/team-hub/team-hub.js',
  './src/features/team-hub/lineup-builder.js', './src/features/team-hub/production-team-hub.js', './src/features/team-hub/production-team-store.js',
  './src/features/teams/team-context.js', './src/features/club/director-dashboard.js', './src/features/club/director-store.js',
  './src/lib/config.js', './src/lib/supabase.js', './src/lib/analytics.js', './src/lib/monitoring.js',
];

async function cacheUrls(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all((urls || []).map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res.clone());
    } catch (error) {
      // Ignore individual misses. Bench Mode also stores the actual practice data in localStorage.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheUrls(CACHE_NAME, APP_SHELL));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => ![CACHE_NAME, RINK_CACHE_NAME].includes(key)).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'BENCHBOSS_PRECACHE' || data.type === 'BENCHBOSS_PRELOAD_RINK_ASSETS') {
    event.waitUntil(cacheUrls(RINK_CACHE_NAME, data.urls || APP_SHELL));
  }
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(async () => {
        return (await caches.match(req)) || (await caches.match('./app.html')) || (await caches.match('./index.html'));
      })
    );
    return;
  }

  if (!sameOrigin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./app.html'));
    })
  );
});
