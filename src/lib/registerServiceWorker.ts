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
  // Handle updates
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[SW] New version available');
        
        if (window.confirm('A new version is available! Reload to update?')) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      }
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed, reloading...');
    window.location.reload();
  });
}


