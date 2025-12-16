/**
 * Performance UX Module
 *
 * Exports all performance-related utilities for optimistic updates,
 * offline support, and prefetching.
 */

// Offline Queue
export {
  useOfflineQueue,
  useOfflineQueueContext,
  OfflineQueueContext,
  type QueuedAction,
  type OfflineQueueContextValue,
} from '../hooks/useOfflineQueue';

// Optimistic Mutations
export {
  useOptimisticMutation,
  useOptimisticListMutation,
  useOptimisticToggle,
  createOfflineOptimisticMutation,
  type OptimisticMutationOptions,
} from '../hooks/useOptimisticMutation';

// Prefetching
export {
  usePrefetchOnHover,
  useNavigationPrefetch,
  useCriticalDataPrefetch,
  createPrefetchHandler,
} from '../hooks/usePrefetch';

// Re-export NetworkStatus components
export { NetworkStatus, OfflineQueueBadge } from '../../components/ui/NetworkStatus';

/**
 * Service Worker Communication Utilities
 */
export function sendToServiceWorker(message: {
  type: string;
  [key: string]: unknown;
}): Promise<MessageEvent | null> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker?.controller) {
      console.warn('No service worker controller available');
      resolve(null);
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event: MessageEvent) => {
      resolve(event);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);

    // Timeout after 10 seconds
    setTimeout(() => resolve(null), 10000);
  });
}

/**
 * Cache data to service worker for offline access
 */
export async function cacheForOffline(key: string, data: unknown): Promise<boolean> {
  if (!navigator.serviceWorker?.controller) {
    // Fallback to localStorage
    try {
      localStorage.setItem(`offline-cache-${key}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  const result = await sendToServiceWorker({
    type: 'CACHE_DATA',
    key,
    value: data,
  });

  return result?.data?.success ?? false;
}

/**
 * Get cached data from service worker
 */
export async function getOfflineCache<T>(key: string): Promise<T | null> {
  if (!navigator.serviceWorker?.controller) {
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`offline-cache-${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  const result = await sendToServiceWorker({
    type: 'GET_CACHED_DATA',
    key,
  });

  if (result?.data?.success) {
    return result.data.data as T;
  }

  return null;
}

/**
 * Request background sync for offline queue
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-expect-error - BackgroundSync API types not fully supported
      await registration.sync.register('offline-queue-sync');
      return true;
    } catch (error) {
      console.warn('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

/**
 * Check if app is running in offline mode
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function onNetworkStatusChange(
  callback: (isOnline: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
