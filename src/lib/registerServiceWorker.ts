// Optimized Service Worker Registration
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported');
    return;
  }

  // Check if already registered
  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (existingRegistration) {
    console.log('[SW] Service worker already registered');
    return existingRegistration;
  }

  // Wait for window load to not block critical rendering path
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      window.addEventListener('load', resolve, { once: true });
    });
  }

  try {
    // Use requestIdleCallback for non-blocking registration
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        await performRegistration();
      }, { timeout: 2000 });
    } else {
      // Fallback with setTimeout for browsers without requestIdleCallback
      setTimeout(async () => {
        await performRegistration();
      }, 1000);
    }
  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

// Immediate registration for push notifications
export async function registerServiceWorkerImmediate() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported');
    return null;
  }

  try {
    // Check if already registered
    let registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('[SW] Service worker already registered (immediate)');
      return registration;
    }

    // Register immediately
    console.log('[SW] Registering service worker immediately...');
    registration = await navigator.serviceWorker.register('/service-worker.js', {
      updateViaCache: 'none',
      scope: '/'
    });
    
    console.log('[SW] Service worker registered successfully (immediate)');
    
    // Setup update handling
    setupUpdateHandlers(registration);
    
    return registration;
  } catch (error) {
    console.error('[SW] Immediate registration failed:', error);
    return null;
  }
}

async function performRegistration() {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      // updateViaCache helps with faster updates
      updateViaCache: 'none',
      scope: '/'
    });

    console.log('[SW] Registration successful');
    
    setupUpdateHandlers(registration);

  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

function setupUpdateHandlers(registration: ServiceWorkerRegistration) {
  // Check for updates periodically (every hour)
  setInterval(() => {
    registration.update();
  }, 60 * 60 * 1000);

  // Handle updates
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker available
        console.log('[SW] New version available');
        
        // Optional: Show update notification to user
        if (window.confirm('A new version is available! Reload to update?')) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      }
    });
  });

  // Handle controller change (when new SW takes over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed, reloading...');
    window.location.reload();
  });
}

// Prefetch critical resources after SW is ready
export async function prefetchCriticalResources() {
  if (!('serviceWorker' in navigator)) return;

  await navigator.serviceWorker.ready;

  // Send message to SW to cache critical routes
  const criticalRoutes = [
    '/',
    '/stocks',
    '/etf',
  ];

  navigator.serviceWorker.controller?.postMessage({
    type: 'CACHE_URLS',
    payload: criticalRoutes
  });
}

// Cleanup old caches periodically
export function setupCacheCleanup() {
  if (!('serviceWorker' in navigator)) return;

  // Run cleanup every 10 min
  setInterval(() => {
    navigator.serviceWorker.controller?.postMessage({
      type: 'CLEANUP_CACHE'
    });
  },  10 * 60 * 1000);
}