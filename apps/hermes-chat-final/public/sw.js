const CACHE_STATIC = 'hermes-static-v1';
const CACHE_PAGES = 'hermes-pages-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_STATIC && key !== CACHE_PAGES)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http: and https: schemes (skip chrome-extension:, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Cache-first for immutable static assets (hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          }),
      ),
    );
    return;
  }

  // Network-first for API routes (never cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Stale-while-revalidate for HTML pages
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_PAGES).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      });
      return cached || fetched;
    }),
  );
});