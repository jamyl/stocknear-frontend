/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

// Optimized service worker with selective caching
const version = Date.now().toString();
const STATIC_CACHE = `static-${version}`;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB limit

// Cache management utilities
class CacheManager {
  static async getCacheSize(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    return totalSize;
  }
  
  static async evictOldestEntries(cacheName, targetSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    // Sort by last access time (approximate with creation time)
    const entries = [];
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        entries.push({
          request,
          date: new Date(response.headers.get('date') || 0),
          size: (await response.clone().blob()).size
        });
      }
    }
    
    // Sort oldest first
    entries.sort((a, b) => a.date - b.date);
    
    let currentSize = await this.getCacheSize(cacheName);
    for (const entry of entries) {
      if (currentSize <= targetSize) break;
      await cache.delete(entry.request);
      currentSize -= entry.size;
      console.log(`[SW] Evicted ${entry.request.url}`);
    }
  }
  
  static async addToCache(cacheName, request, response) {
    const cache = await caches.open(cacheName);
    const responseSize = (await response.clone().blob()).size;
    
    // Check if adding this would exceed limit
    const currentSize = await this.getCacheSize(cacheName);
    if (currentSize + responseSize > MAX_CACHE_SIZE) {
      await this.evictOldestEntries(cacheName, MAX_CACHE_SIZE - responseSize);
    }
    
    await cache.put(request, response);
  }
}

// Only cache these types of static assets
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico'];
const shouldCacheRequest = (url) => {
  // Only cache static assets from same origin
  if (!url.origin.includes(self.location.origin)) return false;
  
  // Cache node_modules assets
  if (url.pathname.includes('node_modules') || url.pathname.includes('_app/')) {
    return CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
  }
  
  // Cache other static assets
  return CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
};

function getIconPath(size: string) {
  return new URL(`/pwa-${size}.png`, self.location.origin).href;
}

const ICONS = {
  DEFAULT: getIconPath('192x192'),
  SMALL: getIconPath('64x64'),
  LARGE: getIconPath('512x512')
};


self.addEventListener('install', (event) => {
  // Skip waiting immediately for fast activation
  self.skipWaiting();
  console.log('[SW] Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log('[SW] Clients claimed');
      
      // Clean up old caches but keep current static cache
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
      console.log('[SW] Cache cleanup completed');
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API calls and external requests
  if (url.pathname.startsWith('/api/') || !url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Only handle cacheable static assets
  if (!shouldCacheRequest(url)) {
    return;
  }
  
  event.respondWith(
    (async () => {
      // Cache-first for static assets
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Fetch from network
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses
        if (networkResponse.ok && networkResponse.status === 200) {
          // Clone before caching (don't await to avoid blocking)
          CacheManager.addToCache(STATIC_CACHE, event.request, networkResponse.clone())
            .catch(err => console.warn('[SW] Caching failed:', err));
        }
        
        return networkResponse;
      } catch (error) {
        console.warn('[SW] Network request failed:', error);
        throw error;
      }
    })()
  );
});

// Cache size monitoring
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_CACHE_SIZE') {
    CacheManager.getCacheSize(STATIC_CACHE)
      .then(size => {
        event.ports[0]?.postMessage({
          type: 'CACHE_SIZE',
          size: size,
          limit: MAX_CACHE_SIZE,
          percentage: Math.round((size / MAX_CACHE_SIZE) * 100)
        });
      })
      .catch(err => console.error('[SW] Cache size check failed:', err));
  }
})

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let title = 'Stocknear';
  let body: string;
  let url = '/';

  try {
    const payload = event.data.text();
    try {
      const jsonData = JSON.parse(payload);
      if (jsonData.title) {
        title = jsonData.title;
        body = jsonData.body;
        url = jsonData.url || '/';
      } else {
        body = payload;
      }
    } catch {
      body = payload;
    }
  } catch {
    body = 'New notification';
  }

  const options: NotificationOptions = {
    body,
    icon: ICONS.DEFAULT,
    badge: ICONS.SMALL,
    timestamp: Date.now(),
    requireInteraction: true,
    tag: 'stocknear-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      suppressNotificationFrom: true,
      url: url
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlPath = event.notification.data.url || '/';
  const urlToOpen = new URL(urlPath, self.location.origin).href;

  event?.waitUntil(
    clients?.matchAll({ type: 'window', includeUncontrolled: true })?.then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients?.openWindow) {
        return clients?.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
