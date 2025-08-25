/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
const RUNTIME_CACHE = `runtime-${version}`;

// Performance optimizations
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
const CHUNK_SIZE = 10; // Cache assets in chunks
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Prioritize critical assets for immediate caching
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  ...build.filter(url => 
    url.includes('app') || 
    url.includes('layout') || 
    url.endsWith('.css')
  )
];

// Defer caching of non-critical assets
const DEFERRED_ASSETS = [...build, ...files]
  .filter(url => !CRITICAL_ASSETS.includes(url))
  .filter(url => !url.includes('.map')) // Skip source maps
  .filter(url => !url.includes('node_modules')); // Skip node_modules if any

function getIconPath(size: string) {
  return new URL(`/pwa-${size}.png`, self.location.origin).href;
}

const ICONS = {
  DEFAULT: getIconPath('192x192'),
  SMALL: getIconPath('64x64'),
  LARGE: getIconPath('512x512')
};

// Helper function to cache assets in parallel chunks
async function cacheInChunks(cache: Cache, assets: string[], chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < assets.length; i += chunkSize) {
    chunks.push(assets.slice(i, i + chunkSize));
  }
  
  // Process chunks in parallel
  await Promise.all(
    chunks.map(chunk => 
      cache.addAll(chunk).catch(err => {
        console.warn('[SW] Failed to cache chunk:', err);
        // Continue even if some assets fail
        return Promise.resolve();
      })
    )
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      
      // Step 1: Cache critical assets immediately (fast)
      console.log('[SW] Caching critical assets...');
      await cache.addAll(CRITICAL_ASSETS).catch(err => {
        console.error('[SW] Critical assets caching failed:', err);
        // Try individual caching as fallback
        return Promise.all(
          CRITICAL_ASSETS.map(url => 
            cache.add(url).catch(() => console.warn(`[SW] Failed to cache: ${url}`))
          )
        );
      });
      
      // Step 2: Skip waiting immediately for faster activation
      await self.skipWaiting();
      console.log('[SW] Service Worker installed');
      
      // Step 3: Cache remaining assets in background (non-blocking)
      cacheInChunks(cache, DEFERRED_ASSETS, CHUNK_SIZE)
        .then(() => console.log('[SW] All assets cached'))
        .catch(err => console.warn('[SW] Some assets failed to cache:', err));
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Claim clients immediately for faster activation
      await self.clients.claim();
      console.log('[SW] Clients claimed');
      
      // Clean up old caches in parallel (non-blocking)
      const keys = await caches.keys();
      const deletePromises = keys
        .filter(key => key !== CACHE && key !== RUNTIME_CACHE)
        .map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        });
      
      // Don't wait for cleanup to complete
      Promise.all(deletePromises)
        .then(() => console.log('[SW] Old caches cleaned'))
        .catch(err => console.warn('[SW] Cache cleanup error:', err));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip caching for external requests and API calls
  if (!url.origin.includes(self.location.origin) || 
      url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      // Try cache first (cache-first strategy for assets)
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        // Return cached response immediately
        return cachedResponse;
      }
      
      // For network requests, implement stale-while-revalidate
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses for HTML/CSS/JS
        if (networkResponse.ok && 
            (event.request.destination === 'document' ||
             event.request.destination === 'script' ||
             event.request.destination === 'style')) {
          
          const cache = await caches.open(RUNTIME_CACHE);
          // Clone the response before caching
          cache.put(event.request, networkResponse.clone())
            .catch(err => console.warn('[SW] Failed to cache:', err));
        }
        
        return networkResponse;
      } catch (error) {
        // If network fails, try runtime cache as fallback
        const runtimeCached = await caches.match(event.request, {
          cacheName: RUNTIME_CACHE
        });
        
        if (runtimeCached) {
          return runtimeCached;
        }
        
        // Return offline page if available
        if (event.request.destination === 'document') {
          const offlinePage = await caches.match('/');
          if (offlinePage) return offlinePage;
        }
        
        throw error;
      }
    })()
  );
});

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

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          // Cache URLs in chunks for better performance
          await cacheInChunks(cache, event.data.payload, CHUNK_SIZE);
        } catch (error) {
          console.error('[SW] Cache update failed:', error);
        }
      })()
    );
  }
  
  // Add cache cleanup message handler
  if (event.data?.type === 'CLEANUP_CACHE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name !== CACHE && name !== RUNTIME_CACHE)
            .map(name => caches.delete(name))
        );
        console.log('[SW] Cache cleanup completed');
      })()
    );
  }
});
