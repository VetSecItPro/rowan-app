/**
 * React Query Offline Persistence
 *
 * Persists React Query cache to IndexedDB for offline support.
 * Cache survives app close and page refresh.
 *
 * Architecture:
 * - Primary storage: IndexedDB (async, large capacity, survives refresh)
 * - Backup storage: localStorage (sync write on unload, limited to 5MB)
 *
 * The backup exists because IndexedDB is async and can't be used in
 * beforeunload handlers. localStorage provides a sync fallback for
 * saving cache state during page close.
 *
 * Cache TTL: 24 hours (MAX_AGE). Stale cache is discarded on restore.
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
    // Persistence failure is non-critical — cache will be rebuilt on next load
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
    // Restore failure is non-critical — cache will be rebuilt from network
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
    // Clear failure is non-critical — stale cache expires via TTL
  }
}

/**
 * Setup automatic cache persistence with multiple save strategies.
 *
 * Save triggers:
 * 1. Periodic (30s debounced): Saves to IndexedDB when cache changes
 * 2. Visibility change: Saves to IndexedDB when tab is hidden (user switches tabs)
 * 3. Page unload: Saves to localStorage (sync) as IndexedDB is async and unreliable in unload
 *
 * Why localStorage backup?
 * IndexedDB operations are async and can be interrupted during page close.
 * localStorage.setItem is synchronous and completes before the page closes.
 * The backup has a shorter TTL (5 min vs 24h) and is deleted after successful restore.
 */
export function setupCachePersistence(queryClient: QueryClient): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Debounced save - batches rapid cache changes into single writes
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

  // Sync backup to localStorage on unload (IndexedDB is async and unreliable here)
  const handleUnload = () => {
    if (typeof navigator !== 'undefined') {
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
        // localStorage full or unavailable - best effort only
      }
    }
  };

  // Save when user switches away from tab
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      persistQueryCache(queryClient);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    unsubscribe();
    if (saveTimer) clearTimeout(saveTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
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
