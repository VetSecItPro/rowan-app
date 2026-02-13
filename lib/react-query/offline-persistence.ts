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
const CACHE_VERSION = 2; // Bumped: now includes userId for cross-user validation
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Module-level flag to prevent `beforeunload` from re-persisting
 * cache data after signout cleanup has already run.
 */
let _isSigningOut = false;

interface PersistedCache {
  version: number;
  timestamp: number;
  userId?: string;
  clientState: unknown;
}

/**
 * Mark that signout is in progress — prevents beforeunload from re-saving stale data.
 */
export function markSigningOut(): void {
  _isSigningOut = true;
}

/**
 * Get the current user ID from the auth session query in the cache.
 * Returns undefined if no session exists.
 */
function getCurrentUserId(queryClient: QueryClient): string | undefined {
  try {
    // Look for the session query data that useAuthSession stores
    const queries = queryClient.getQueryCache().getAll();
    for (const query of queries) {
      if (
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'auth' &&
        query.queryKey[1] === 'session'
      ) {
        const session = query.state.data as { user?: { id?: string } } | null;
        return session?.user?.id;
      }
    }
  } catch {
    // Best-effort — if we can't determine user, cache will still work
  }
  return undefined;
}

/**
 * Save query cache to IndexedDB
 */
export async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  if (_isSigningOut) return; // Don't persist during signout

  try {
    const state = queryClient.getQueryCache().getAll().map((query) => ({
      queryKey: query.queryKey,
      queryHash: query.queryHash,
      state: query.state,
    }));

    const cache: PersistedCache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      userId: getCurrentUserId(queryClient),
      clientState: state,
    };

    await set(CACHE_KEY, cache);
  } catch (error) {
    // Persistence failure is non-critical — cache will be rebuilt on next load
  }
}

/**
 * Restore query cache from IndexedDB
 *
 * @param queryClient - The query client to restore into
 * @param currentUserId - The currently authenticated user's ID. If provided,
 *   the cache is only restored if it belongs to this user. This prevents
 *   cross-user data leakage when a different user logs in on the same browser.
 */
export async function restoreQueryCache(
  queryClient: QueryClient,
  currentUserId?: string,
): Promise<boolean> {
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

    // Validate cache belongs to the current user — prevents cross-user data leakage
    if (currentUserId && cache.userId && cache.userId !== currentUserId) {
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
 * Clear persisted cache (IndexedDB + localStorage backup)
 *
 * MUST be called on logout to prevent cross-user data leakage.
 * Also sets the signout flag to prevent beforeunload from re-saving.
 */
export async function clearPersistedCache(): Promise<void> {
  _isSigningOut = true;
  try {
    await del(CACHE_KEY);
  } catch {
    // IndexedDB clear failure — stale cache expires via TTL
  }
  try {
    localStorage.removeItem(CACHE_KEY + '-backup');
  } catch {
    // localStorage clear failure — backup expires in 5 min
  }
}

/**
 * Clear all Rowan-specific localStorage keys.
 *
 * Removes currentSpace entries, sidebar state, and any other
 * app-scoped keys to prevent data leaking across user sessions.
 */
export function clearAllAppStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('currentSpace_') ||
        key.startsWith('rowan-') ||
        key === 'sidebar-expanded' ||
        key === 'dashboard-mode'
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage access failure — non-critical
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
    // Don't re-save during signout — cache was intentionally cleared
    if (_isSigningOut) return;

    if (typeof navigator !== 'undefined') {
      try {
        const state = queryClient.getQueryCache().getAll().map((query) => ({
          queryKey: query.queryKey,
          state: { data: query.state.data, dataUpdatedAt: query.state.dataUpdatedAt },
        }));
        localStorage.setItem(CACHE_KEY + '-backup', JSON.stringify({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          userId: getCurrentUserId(queryClient),
          clientState: state,
        }));
      } catch {
        // localStorage full or unavailable - best effort only
      }
    }
  };

  // Save when user switches away from tab
  const handleVisibilityChange = () => {
    if (!_isSigningOut && document.visibilityState === 'hidden') {
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
 *
 * @param queryClient - The query client to restore into
 * @param currentUserId - The currently authenticated user's ID. If provided,
 *   the backup is only restored if it belongs to this user.
 */
export async function restoreFromBackup(
  queryClient: QueryClient,
  currentUserId?: string,
): Promise<boolean> {
  try {
    const backup = localStorage.getItem(CACHE_KEY + '-backup');
    if (!backup) return false;

    const cache = JSON.parse(backup) as PersistedCache;

    // Only use backup if it's recent (< 5 minutes)
    if (Date.now() - cache.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(CACHE_KEY + '-backup');
      return false;
    }

    // Validate backup belongs to the current user
    if (currentUserId && cache.userId && cache.userId !== currentUserId) {
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
