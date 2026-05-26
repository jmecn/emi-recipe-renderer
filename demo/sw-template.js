const CACHE_VERSION = __CACHE_VERSION__;
const STATIC_CACHE = `emi-demo-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `emi-demo-runtime-${CACHE_VERSION}`;
const CACHE_PREFIX = 'emi-demo-';
const SHELL_URLS = [
  './',
  './index.html',
  './demo.css',
  './demo-app.js',
  './lib/emi.css',
  './lib/emi.js',
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function inScope(url) {
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
}

function scopeRelativePath(url) {
  const scope = new URL(self.registration.scope);
  return url.pathname.slice(scope.pathname.length);
}

function isRuntimeStaticAsset(url) {
  if (!inScope(url)) return false;
  const rel = scopeRelativePath(url);
  return rel === ''
    || rel === 'index.html'
    || rel === 'demo.css'
    || rel === 'demo-app.js'
    || rel.startsWith('lib/')
    || rel.startsWith('emi/');
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return cache.match(scopeUrl('./'));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(SHELL_URLS.map(scopeUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
        return caches.delete(name);
      }
      return null;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!inScope(url)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isRuntimeStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});
