/**
 * Service Worker Registration Utility
 * Handles PWA service worker lifecycle management
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register the service worker
 * @param {Object} config - Configuration options
 * @param {Function} config.onUpdate - Called when a new service worker is available
 * @param {Function} config.onSuccess - Called when content is cached for offline use
 */
export function register(config = {}) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      if (isLocalhost) {
        // In development, check if SW is valid
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('[PWA] Service worker is ready (localhost)');
        });
      } else {
        // In production, register SW
        registerValidSW(swUrl, config);
      }
    });
  }
}

/**
 * Register a valid service worker
 */
async function registerValidSW(swUrl, config) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content available
            console.log('[PWA] New content available, please refresh');
            if (config?.onUpdate) {
              config.onUpdate(registration);
            }
          } else {
            // Content cached for offline use
            console.log('[PWA] Content cached for offline use');
            if (config?.onSuccess) {
              config.onSuccess(registration);
            }
          }
        }
      };
    };

    // Register for periodic background sync
    if ('periodicSync' in registration) {
      try {
        await registration.periodicSync.register('refresh-dashboard', {
          minInterval: 60 * 60 * 1000, // 1 hour
        });
        console.log('[PWA] Periodic background sync registered');
      } catch (err) {
        console.log('[PWA] Periodic sync not available:', err.message);
      }
    }

    console.log('[PWA] Service worker registered successfully');
  } catch (error) {
    console.error('[PWA] Error during service worker registration:', error);
  }
}

/**
 * Check if the service worker is valid (for localhost)
 */
async function checkValidServiceWorker(swUrl, config) {
  try {
    const response = await fetch(swUrl, {
      headers: { 'Service-Worker': 'script' },
    });

    const contentType = response.headers.get('content-type');
    if (
      response.status === 404 ||
      (contentType != null && contentType.indexOf('javascript') === -1)
    ) {
      // No service worker found - reload
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
    } else {
      registerValidSW(swUrl, config);
    }
  } catch {
    console.log('[PWA] No internet connection. Running in offline mode.');
  }
}

/**
 * Unregister the service worker
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      console.log('[PWA] Service worker unregistered');
    } catch (error) {
      console.error('[PWA] Error unregistering service worker:', error);
    }
  }
}

/**
 * Request notification permission
 * @returns {Promise<string>} The permission state
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  console.log('[PWA] Notification permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 * @param {string} vapidPublicKey - VAPID public key for push subscription
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeToPush(vapidPublicKey) {
  if (!('PushManager' in window)) {
    console.log('[PWA] Push messaging not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('[PWA] Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('[PWA] Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Convert a base64 string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the app can be installed (PWA install prompt)
 */
export function setupInstallPrompt(callback) {
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (callback) callback(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (callback) callback(false);
    console.log('[PWA] App installed successfully');
  });

  return {
    canInstall: () => deferredPrompt !== null,
    install: async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    },
  };
}

/**
 * Register background sync for offline operations
 */
export async function registerBackgroundSync(tag) {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('[PWA] Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log(`[PWA] Background sync registered: ${tag}`);
    return true;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}

/**
 * Get cache storage info
 */
export async function getCacheInfo() {
  if (!('caches' in window)) return null;

  try {
    const cacheNames = await caches.keys();
    const info = [];

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      info.push({ name, entries: keys.length });
    }

    // Get storage estimate if available
    let estimate = null;
    if (navigator.storage && navigator.storage.estimate) {
      estimate = await navigator.storage.estimate();
    }

    return { caches: info, storage: estimate };
  } catch (error) {
    console.error('[PWA] Failed to get cache info:', error);
    return null;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  if (!('caches' in window)) return false;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[PWA] All caches cleared');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
    return false;
  }
}
