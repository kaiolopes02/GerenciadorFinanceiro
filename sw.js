/* ============================================================
   sw.js — Service Worker (offline-first PWA)
   ============================================================ */
var CACHE_NAME = 'gestor-financeiro-v1';
var ASSETS = [
  '/',
  '/index.html',
  '/assets/VFIcon.png',
  '/assets/VFLogo.png',
  '/css/tokens.css',
  '/css/base.css',
  '/css/app.css',
  '/src/core.js',
  '/src/repository.js',
  '/src/theme-router.js',
  '/src/currency-utils.js',
  '/src/models.js',
  '/src/services.js',
  '/src/components-shell.js',
  '/src/components-data.js',
  '/src/page-dashboard.js',
  '/src/page-transacoes.js',
  '/src/page-objetivos.js',
  '/src/page-dividas.js',
  '/src/page-config.js',
  '/src/app.js'
];

/* === INSTALL — precache assets === */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Use addAll with care — if any asset fails, the whole batch fails.
      // For resilience, cache files individually and ignore failures.
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function() { /* ignore individual failures */ });
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* === ACTIVATE — cleanup old caches === */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
             .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* === FETCH — offline-first with network fallback for navigation === */
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // For navigation requests, try network first, fall back to cached index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For static assets, cache-first strategy
  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        // Cache same-origin responses for future use
        if (response && response.status === 200 && new URL(req.url).origin === self.location.origin) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function() {
        // Offline and not cached — return nothing
      });
    })
  );
});
