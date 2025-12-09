// Service Worker for Push Notifications and Offline Support
// This runs in the background and handles push notifications and caching

const CACHE_VERSION = 'v2';
const STATIC_CACHE_NAME = `rowan-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `rowan-dynamic-${CACHE_VERSION}`;
const NOTIFICATION_CACHE_NAME = 'rowan-notifications-v1';

// Assets to cache immediately on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/rowan-logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html', // Fallback page for offline
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

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Don't fail install if some assets fail to cache
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
  } else {
    // Network-first with offline fallback for pages
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
      body: JSON.stringify({
        notificationId: notificationData.id,
        timestamp: Date.now(),
      }),
    }).catch((error) => console.error('[Service Worker] Error tracking dismissal:', error));
  }
});

// Message event - for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
