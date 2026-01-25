/**
 * React Query Offline Persistence
 *
 * Persists React Query cache to IndexedDB for offline support.
 * Cache survives app close and page refresh.
 */

import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'rowan-query-cache';
const CACHE_VERSION = 1;
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedCache {
  version: number;
  timestamp: number;
  clientState: unknown;
}

/**
 * Save query cache to IndexedDB
 */
export async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const state = queryClient.getQueryCache().getAll().map((query) => ({
      queryKey: query.queryKey,
      queryHash: query.queryHash,
      state: query.state,
    }));

    const cache: PersistedCache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      clientState: state,
    };

    await set(CACHE_KEY, cache);
  } catch (error) {
    console.warn('[Offline] Failed to persist query cache:', error);
  }
}

/**
 * Restore query cache from IndexedDB
 */
export async function restoreQueryCache(queryClient: QueryClient): Promise<boolean> {
  try {
    const cache = await get<PersistedCache>(CACHE_KEY);

    if (!cache) {
      return false;
    }

    // Check version compatibility
    if (cache.version !== CACHE_VERSION) {
      await del(CACHE_KEY);
      return false;
    }

    // Check if cache is too old
    if (Date.now() - cache.timestamp > MAX_AGE) {
      await del(CACHE_KEY);
      return false;
    }

    // Restore each query
    const state = cache.clientState as Array<{
      queryKey: unknown[];
      queryHash: string;
      state: { data: unknown; dataUpdatedAt: number };
    }>;

    for (const query of state) {
      if (query.state.data !== undefined) {
        queryClient.setQueryData(query.queryKey, query.state.data, {
          updatedAt: query.state.dataUpdatedAt,
        });
      }
    }

    return true;
  } catch (error) {
    console.warn('[Offline] Failed to restore query cache:', error);
    return false;
  }
}

/**
 * Clear persisted cache
 */
export async function clearPersistedCache(): Promise<void> {
  try {
    await del(CACHE_KEY);
  } catch (error) {
    console.warn('[Offline] Failed to clear persisted cache:', error);
  }
}

/**
 * Setup automatic cache persistence
 * Saves cache on window unload and periodically
 */
export function setupCachePersistence(queryClient: QueryClient): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Save every 30 seconds if there are changes
  const scheduleSave = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistQueryCache(queryClient);
    }, 30000);
  };

  // Subscribe to cache changes
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    scheduleSave();
  });

  // Save on page unload
  const handleUnload = () => {
    // Save synchronously to localStorage as backup (IndexedDB not available in unload)
    if (typeof navigator !== 'undefined') {
      // Can't use IndexedDB in unload, save synchronously to localStorage as backup
      try {
        const state = queryClient.getQueryCache().getAll().map((query) => ({
          queryKey: query.queryKey,
          state: { data: query.state.data, dataUpdatedAt: query.state.dataUpdatedAt },
        }));
        localStorage.setItem(CACHE_KEY + '-backup', JSON.stringify({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          clientState: state,
        }));
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        persistQueryCache(queryClient);
      }
    });
  }

  return () => {
    unsubscribe();
    if (saveTimer) clearTimeout(saveTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
    }
  };
}

/**
 * Restore from localStorage backup (used after page load)
 */
export async function restoreFromBackup(queryClient: QueryClient): Promise<boolean> {
  try {
    const backup = localStorage.getItem(CACHE_KEY + '-backup');
    if (!backup) return false;

    const cache = JSON.parse(backup) as PersistedCache;

    // Only use backup if it's recent (< 5 minutes)
    if (Date.now() - cache.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(CACHE_KEY + '-backup');
      return false;
    }

    const state = cache.clientState as Array<{
      queryKey: unknown[];
      state: { data: unknown; dataUpdatedAt: number };
    }>;

    for (const query of state) {
      if (query.state.data !== undefined) {
        queryClient.setQueryData(query.queryKey, query.state.data, {
          updatedAt: query.state.dataUpdatedAt,
        });
      }
    }

    localStorage.removeItem(CACHE_KEY + '-backup');
    return true;
  } catch {
    return false;
  }
}
