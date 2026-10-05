import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const workerSource = readFileSync(new URL('../../public/service-worker.js', import.meta.url), 'utf8');
const offlinePage = readFileSync(new URL('../../public/offline.html', import.meta.url), 'utf8');
const origin = 'https://solo-studio.example';
const scope = `${origin}/solo-studio/`;

function createWorker(fetchImpl) {
  const handlers = new Map();
  const entries = new Map();
  const cacheKey = (request) =>
    new URL(typeof request === 'string' ? request : request.url ?? String(request), scope).href;
  const cache = {
    async addAll(urls) {
      for (const url of urls) {
        const body = url.endsWith('/offline.html') ? offlinePage : `public asset ${url}`;
        entries.set(cacheKey(url), new Response(body, { status: 200 }));
      }
    },
    async match(request) {
      return entries.get(cacheKey(request));
    },
    async put(request, response) {
      entries.set(cacheKey(request), response);
    },
  };
  const self = {
    location: { origin },
    registration: { scope },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
  };
  const caches = {
    open: async () => cache,
    match: cache.match,
    keys: async () => [],
    delete: async () => true,
  };

  runInNewContext(workerSource, { self, caches, URL, Response, fetch: fetchImpl });
  return { handlers, entries };
}

async function installWorker(worker) {
  let installPromise;
  worker.handlers.get('install')({ waitUntil: (promise) => { installPromise = promise; } });
  await installPromise;
}

test('private workspace API reads are never cached or intercepted', async () => {
  const networkRequests = [];
  const worker = createWorker(async (request) => {
    networkRequests.push(request.url);
    return new Response('private workspace response');
  });
  await installWorker(worker);

  let intercepted = false;
  worker.handlers.get('fetch')({
    request: {
      method: 'GET',
      mode: 'cors',
      url: `${scope}api/studio/workspace`,
      headers: new Headers(),
    },
    respondWith() {
      intercepted = true;
    },
  });

  assert.equal(intercepted, false);
  assert.deepEqual(networkRequests, []);
  assert.equal([...worker.entries.keys()].some((url) => url.includes('/api/')), false);
});

test('offline navigation returns the public offline screen, not a cached workspace page', async () => {
  const worker = createWorker(async () => {
    throw new Error('Network unavailable');
  });
  await installWorker(worker);

  let navigationResponse;
  worker.handlers.get('fetch')({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: `${scope}projects`,
      headers: new Headers(),
    },
    respondWith(promise) {
      navigationResponse = promise;
    },
  });

  const response = await navigationResponse;
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Your studio is offline/);
  assert.match(offlinePage, /not stored on this device for offline access/);
  assert.equal([...worker.entries.keys()].some((url) => url.includes('/api/')), false);
});
