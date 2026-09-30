// Pacific Admin PWA Service Worker
const CACHE_NAME = 'pacific-admin-pwa-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tab-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[PWA SW] Pre-caching partial failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Never intercept Vite development HMR, internal modules, or WebSockets
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.searchParams.has('token') ||
    url.searchParams.has('t') ||
    url.searchParams.has('import') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Skip caching API requests or dynamic server routes
  if (url.pathname.startsWith('/api') || url.pathname.includes('/rest/v1/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If response is valid and is an asset/page, clone and cache
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.destination === 'document' ||
            event.request.destination === 'image' ||
            event.request.destination === 'font' ||
            event.request.destination === 'style' ||
            event.request.destination === 'script')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If document navigation fails and offline, return cached index.html SPA shell
        if (
          event.request.mode === 'navigate' ||
          event.request.destination === 'document' ||
          !url.pathname.includes('.')
        ) {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
        }
        // Fallback gracefully without throwing a synthetic 503 response
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      })
  );
});
