// Service Worker for Push Notifications and Offline Support
// This runs in the background and handles push notifications and caching

const CACHE_VERSION = 'v3';
const STATIC_CACHE_NAME = `rowan-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `rowan-dynamic-${CACHE_VERSION}`;
const NOTIFICATION_CACHE_NAME = 'rowan-notifications-v1';

// Request timeout for slow networks (3 seconds)
const NETWORK_TIMEOUT = 3000;

// Assets to cache immediately on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/rowan-logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html', // Fallback page for offline
];

// Critical app routes to cache for instant loading
const APP_SHELL_ROUTES = [
  '/dashboard',
  '/tasks',
  '/calendar',
  '/reminders',
  '/messages',
  '/shopping',
  '/goals',
];

// API routes that should use network-first strategy
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/',
];

// Routes to cache with stale-while-revalidate
const STALE_WHILE_REVALIDATE_ROUTES = [
  '/_next/static/',
  '/fonts/',
  '/images/',
];

// Install event - cache static assets and app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    // Cache static assets only — auth-protected app shell routes are cached
    // dynamically on first successful visit (avoids caching redirect responses)
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return Promise.allSettled(
          STATIC_ASSETS.map((asset) =>
            cache.add(asset).catch((err) => {
              console.warn(`[Service Worker] Failed to cache: ${asset}`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Keep current version caches and notification cache
              return cacheName !== STATIC_CACHE_NAME &&
                     cacheName !== DYNAMIC_CACHE_NAME &&
                     cacheName !== NOTIFICATION_CACHE_NAME &&
                     cacheName.startsWith('rowan-');
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except for fonts)
  if (url.origin !== location.origin && !url.hostname.includes('fonts.')) {
    return;
  }

  // Determine caching strategy based on request URL
  if (NETWORK_FIRST_ROUTES.some((route) => url.pathname.startsWith(route))) {
    // Network-first for API routes
    event.respondWith(networkFirst(request));
  } else if (STALE_WHILE_REVALIDATE_ROUTES.some((route) => url.pathname.includes(route))) {
    // Stale-while-revalidate for static assets
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    // Cache-first for static files
    event.respondWith(cacheFirst(request));
  } else if (APP_SHELL_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(route + '/'))) {
    // Network-first with timeout for app shell routes (instant on slow networks)
    event.respondWith(networkFirstWithTimeout(request));
  } else {
    // Network-first with offline fallback for other pages
    event.respondWith(networkFirstWithOfflineFallback(request));
  }
});

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first fetch failed:', error);
    // Return a fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      return caches.match('/rowan-logo.png');
    }
    throw error;
  }
}

// Network-first strategy (for API routes)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful GET responses for offline fallback
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network-first fetch failed:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network-first with timeout (for slow connections)
// Falls back to cache if network takes too long
async function networkFirstWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if it was a timeout
    if (error.name === 'AbortError') {
      console.log('[Service Worker] Request timed out, falling back to cache:', request.url);
    } else {
      console.error('[Service Worker] Network request failed:', error);
    }

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

// Network-first with offline fallback (for pages)
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network request failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('[Service Worker] Stale-while-revalidate fetch failed:', error);
      // Return a fallback response so we never resolve to undefined
      return cachedResponse || new Response('Service unavailable', { status: 503 });
    });

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// Push event - receives push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let notificationData = {
    title: 'Rowan Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
        tag: data.tag || 'rowan-notification',
        requireInteraction: data.requireInteraction || false,
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/check-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/close-icon.png',
        },
      ],
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  // Handle action clicks
  if (event.action === 'dismiss') {
    return;
  }

  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed', event.notification.tag);

  // Optional: Track notification dismissals
  const notificationData = event.notification.data;
  if (notificationData?.trackDismissal) {
    // Send analytics or tracking data
    fetch('/api/notifications/track-dismissal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        notification_id: notificationData.id,
        timestamp: Date.now(),
      }),
    }).catch((error) => console.error('[Service Worker] Error tracking dismissal:', error));
  }
});

// Allowlist of valid message types the service worker accepts
const ALLOWED_MESSAGE_TYPES = [
  'SKIP_WAITING',
  'CLEAR_CACHE',
  'GET_VERSION',
  'SYNC_OFFLINE_QUEUE',
  'CACHE_DATA',
  'GET_CACHED_DATA',
];

// Message event - for communication with main thread
// SECURITY: Validates origin and message type to prevent malicious messages
self.addEventListener('message', (event) => {
  // SECURITY: Validate message origin - only accept messages from same origin
  // event.origin is the origin of the client that sent the message
  // For service workers, we check that the source is a valid WindowClient
  if (!event.source || event.source.type !== 'window') {
    console.warn('[Service Worker] Rejected message from non-window source');
    return;
  }

  // SECURITY: Validate message structure
  if (!event.data || typeof event.data !== 'object' || typeof event.data.type !== 'string') {
    console.warn('[Service Worker] Rejected malformed message');
    return;
  }

  const { type } = event.data;

  // SECURITY: Check against allowlist of valid message types
  if (!ALLOWED_MESSAGE_TYPES.includes(type)) {
    console.warn('[Service Worker] Rejected unknown message type:', type);
    return;
  }

  console.log('[Service Worker] Processing message:', type);

  // Handle allowed message types
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('rowan-'))
            .map((name) => caches.delete(name))
        );
      }).then(() => {
        // Notify the client that cache was cleared
        if (event.source) {
          event.source.postMessage({ type: 'CACHE_CLEARED', success: true });
        }
      });
      break;

    case 'GET_VERSION':
      // Return the current cache version
      if (event.source) {
        event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
      }
      break;

    case 'SYNC_OFFLINE_QUEUE':
      // Handle background sync for offline queue
      handleOfflineQueueSync(event.data.queue, event.source);
      break;

    case 'CACHE_DATA':
      // Cache custom data (e.g., dashboard state for offline)
      handleCacheData(event.data.key, event.data.value, event.source);
      break;

    case 'GET_CACHED_DATA':
      // Retrieve cached custom data
      handleGetCachedData(event.data.key, event.source);
      break;

    default:
      // This shouldn't happen due to allowlist check, but just in case
      console.warn('[Service Worker] Unhandled message type:', type);
  }
});

// Custom data cache name for app state
const APP_DATA_CACHE_NAME = 'rowan-app-data-v1';

/**
 * Handle offline queue synchronization
 * Processes queued actions when connection is restored
 */
async function handleOfflineQueueSync(queue, source) {
  if (!queue || !Array.isArray(queue)) {
    source?.postMessage({ type: 'SYNC_RESULT', success: false, error: 'Invalid queue' });
    return;
  }

  console.log('[Service Worker] Processing offline queue:', queue.length, 'items');

  const results = [];
  for (const action of queue) {
    try {
      const response = await fetch(action.url || action.endpoint, {
        method: action.method,
        headers: action.headers || { 'Content-Type': 'application/json' },
        body: action.body !== undefined ? action.body : JSON.stringify(action.data),
        credentials: 'include',
      });

      if (!response.ok && response.status === 401) {
        // Auth expired — don't retry, mark as failed
        results.push({ id: action.id, success: false, status: 401, error: 'Auth expired' });
        continue;
      }

      results.push({
        id: action.id,
        success: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        id: action.id,
        success: false,
        error: error.message,
      });
    }
  }

  source?.postMessage({
    type: 'SYNC_RESULT',
    success: true,
    results,
    syncedCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
  });
}

/**
 * Cache custom data for offline access
 * Used for caching dashboard state, user preferences, etc.
 */
async function handleCacheData(key, value, source) {
  if (!key || typeof key !== 'string') {
    source?.postMessage({ type: 'CACHE_DATA_RESULT', success: false, error: 'Invalid key' });
    return;
  }

  try {
    const cache = await caches.open(APP_DATA_CACHE_NAME);
    const response = new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(`/app-data/${key}`, response);

    source?.postMessage({ type: 'CACHE_DATA_RESULT', success: true, key });
  } catch (error) {
    console.error('[Service Worker] Error caching data:', error);
    source?.postMessage({ type: 'CACHE_DATA_RESULT', success: false, error: error.message });
  }
}

/**
 * Retrieve cached custom data
 */
async function handleGetCachedData(key, source) {
  if (!key || typeof key !== 'string') {
    source?.postMessage({ type: 'CACHED_DATA', success: false, error: 'Invalid key' });
    return;
  }

  try {
    const cache = await caches.open(APP_DATA_CACHE_NAME);
    const response = await cache.match(`/app-data/${key}`);

    if (response) {
      const data = await response.json();
      source?.postMessage({ type: 'CACHED_DATA', success: true, key, data });
    } else {
      source?.postMessage({ type: 'CACHED_DATA', success: false, key, error: 'Not found' });
    }
  } catch (error) {
    console.error('[Service Worker] Error retrieving cached data:', error);
    source?.postMessage({ type: 'CACHED_DATA', success: false, error: error.message });
  }
}

// Background Sync for offline queue (when supported)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'offline-queue-sync') {
    event.waitUntil(syncOfflineQueueFromStorage());
  }
});

/**
 * Sync offline queue from localStorage (for background sync)
 */
async function syncOfflineQueueFromStorage() {
  try {
    // Get the queue from a cached request or IndexedDB
    const cache = await caches.open(APP_DATA_CACHE_NAME);
    const queueResponse = await cache.match('/app-data/offline-queue');

    if (!queueResponse) {
      console.log('[Service Worker] No offline queue found');
      return;
    }

    const queueData = await queueResponse.json();
    if (!queueData.queue || queueData.queue.length === 0) {
      console.log('[Service Worker] Offline queue is empty');
      return;
    }

    console.log('[Service Worker] Background syncing', queueData.queue.length, 'items');

    for (const action of queueData.queue) {
      try {
        const response = await fetch(action.url || action.endpoint, {
          method: action.method,
          headers: action.headers || { 'Content-Type': 'application/json' },
          body: action.body !== undefined ? action.body : JSON.stringify(action.data),
          credentials: 'include',
        });

        if (!response.ok) {
          console.warn('[Service Worker] Background sync response not ok:', action.id, response.status);
        }
      } catch (error) {
        console.error('[Service Worker] Background sync failed for action:', action.id, error);
      }
    }

    // Clear the queue after sync
    await cache.delete('/app-data/offline-queue');

    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'BACKGROUND_SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('[Service Worker] Background sync error:', error);
  }
}
