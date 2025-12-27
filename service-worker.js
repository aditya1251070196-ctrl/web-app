const CACHE_NAME = 'traffic-sign-cache-v1';

const ASSETS = [
  './',                       // index.html
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './service-worker.js',
  './tf.min.js',               // include if you have it in root
  './icons/icon-192.png',
  './icons/icon-512.png',
  './model/model.json',
  './model/traffic_sign_model.weights.bin',
  './model/labels.json'
];

// INSTALL: cache all assets safely
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
          console.log('[SW] Cached:', asset);
        } catch (err) {
          console.warn('[SW] Failed to cache:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// ACTIVATE: remove old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(networkResponse => {
          // Cache dynamically fetched files
          return caches.open(CACHE_NAME).then(cache => {
            try {
              cache.put(event.request, networkResponse.clone());
            } catch (err) {
              console.warn('[SW] Failed to cache dynamically:', event.request.url, err);
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Optional fallback for documents
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
