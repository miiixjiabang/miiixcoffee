const CACHE_NAME = 'miiix-cache-v1';

const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
  '/icon.svg',
];

// 安装时预缓存核心页面
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 网络优先策略（API 请求不缓存）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 请求不缓存，直接走网络
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 静态资源缓存优先
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 离线时返回缓存的页面
        if (event.request.mode === 'navigate') {
          return caches.match('/login');
        }
        return new Response('离线中', { status: 503 });
      });
    })
  );
});