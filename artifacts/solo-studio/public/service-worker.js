const CACHE_NAME = 'solo-studio-public-static-v1';
const PRECACHE_FILES = [
  'offline.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
];

const publicFiles = new Set(PRECACHE_FILES);

self.addEventListener('install', (event) => {
  const scope = new URL(self.registration.scope);
  const files = PRECACHE_FILES.map((file) => new URL(file, scope).toString());

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(files))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('solo-studio-public-static-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;

  const relativePath = url.pathname.slice(scope.pathname.length);
  if (/^api(?:\/|$)/i.test(relativePath)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlineUrl = new URL('offline.html', scope);
        return (
          (await caches.match(offlineUrl)) ??
          new Response('Solo Studio is offline. Reconnect and try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      }),
    );
    return;
  }

  const isBundledAsset = relativePath.startsWith('assets/');
  const isPublicAsset = publicFiles.has(relativePath);
  if (!isBundledAsset && !isPublicAsset) return;
  if (request.headers.has('authorization')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      return fetch(request).then(async (response) => {
        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      });
    }),
  );
});
