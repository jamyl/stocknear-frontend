/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
const RUNTIME_CACHE = `runtime-${version}`;

// Minimal caching - only cache essential files
const ESSENTIAL_ASSETS = [
  '/',
  '/manifest.json'
];

function getIconPath(size: string) {
  return new URL(`/pwa-${size}.png`, self.location.origin).href;
}

const ICONS = {
  DEFAULT: getIconPath('192x192'),
  SMALL: getIconPath('64x64'),
  LARGE: getIconPath('512x512')
};


self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      
      // Only cache essential assets
      console.log('[SW] Caching essential assets...');
      await cache.addAll(ESSENTIAL_ASSETS).catch(err => {
        console.error('[SW] Essential assets caching failed:', err);
      });
      
      await self.skipWaiting();
      console.log('[SW] Service Worker installed');
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log('[SW] Clients claimed');
      
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== CACHE && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
      console.log('[SW] Old caches cleaned');
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
      // Network-first strategy - minimal caching
      try {
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        // Only fallback to cache for essential assets
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return offline page for documents
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
});
