// Service Worker for Push Notifications
// This runs in the background and handles push notifications

const CACHE_NAME = 'rowan-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

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
