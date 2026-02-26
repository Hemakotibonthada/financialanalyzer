/* eslint-disable no-restricted-globals */

/**
 * FinAnalyzer Service Worker
 * Provides offline support, caching, and background sync
 */

const CACHE_NAME = 'finanalyzer-v1';
const STATIC_CACHE = 'finanalyzer-static-v1';
const DYNAMIC_CACHE = 'finanalyzer-dynamic-v1';
const API_CACHE = 'finanalyzer-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/health',
  '/api/budgets',
  '/api/goals',
  '/api/networth',
  '/api/investments',
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE = 100;
const MAX_API_CACHE = 50;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[ServiceWorker] Pre-cache failed:', err);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE && 
                     name !== API_CACHE;
            })
            .map((name) => {
              console.log('[ServiceWorker] Removing old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Trim cache to maximum size
 */
const trimCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
};

/**
 * Network-first strategy for API calls
 */
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      trimCache(API_CACHE, MAX_API_CACHE);
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ success: false, message: 'You are offline', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Cache-first strategy for static assets
 */
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE);
    return networkResponse;
  } catch (err) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    return new Response('Offline', { status: 503 });
  }
};

/**
 * Stale-while-revalidate strategy
 */
const staleWhileRevalidate = async (request) => {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
};

/**
 * Fetch event - route requests to appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (JS, CSS, images) - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - stale while revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default - network first
  event.respondWith(networkFirst(request));
});

/**
 * Background sync for offline transactions
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
  
  if (event.tag === 'sync-budget-updates') {
    event.waitUntil(syncBudgetUpdates());
  }
});

/**
 * Sync pending transactions when back online
 */
const syncTransactions = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('pending-transactions', 'readonly');
    const store = tx.objectStore('pending-transactions');
    const pendingItems = await store.getAll();
    
    for (const item of pendingItems) {
      try {
        await fetch('/api/financial/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        
        // Remove from pending
        const deleteTx = db.transaction('pending-transactions', 'readwrite');
        deleteTx.objectStore('pending-transactions').delete(item.id);
      } catch (err) {
        console.error('[ServiceWorker] Failed to sync transaction:', err);
      }
    }
  } catch (err) {
    console.error('[ServiceWorker] Sync transactions failed:', err);
  }
};

/**
 * Sync pending budget updates
 */
const syncBudgetUpdates = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('pending-budgets', 'readonly');
    const store = tx.objectStore('pending-budgets');
    const pendingItems = await store.getAll();
    
    for (const item of pendingItems) {
      try {
        await fetch(`/api/budgets/${item.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        
        const deleteTx = db.transaction('pending-budgets', 'readwrite');
        deleteTx.objectStore('pending-budgets').delete(item.id);
      } catch (err) {
        console.error('[ServiceWorker] Failed to sync budget:', err);
      }
    }
  } catch (err) {
    console.error('[ServiceWorker] Sync budgets failed:', err);
  }
};

/**
 * Simple IndexedDB wrapper
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('finanalyzer-offline', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-transactions')) {
        db.createObjectStore('pending-transactions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-budgets')) {
        db.createObjectStore('pending-budgets', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = { title: 'FinAnalyzer', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'general',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-dashboard') {
    event.waitUntil(refreshDashboardData());
  }
});

const refreshDashboardData = async () => {
  try {
    const response = await fetch('/api/aggregation/dashboard');
    if (response.ok) {
      const data = await response.json();
      const cache = await caches.open(API_CACHE);
      cache.put('/api/aggregation/dashboard', new Response(JSON.stringify(data)));
    }
  } catch (err) {
    console.log('[ServiceWorker] Background refresh failed (offline)');
  }
};

console.log('[ServiceWorker] Service worker loaded');
