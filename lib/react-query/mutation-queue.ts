/**
 * Mutation Queue for Offline Support
 *
 * Automatically queues mutations when offline and syncs when connection restored.
 * Integrates with React Query for seamless offline-first mutations.
 * Includes conflict resolution strategies for stale data handling.
 */

import { MutationCache } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'rowan-mutation-queue';
const CONFLICTS_KEY = 'rowan-mutation-conflicts';
const QUEUE_VERSION = 1;

/** Conflict resolution strategies */
export type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual';

export interface QueuedMutation {
  id: string;
  timestamp: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  /** Original data for conflict detection */
  originalData?: unknown;
  /** Entity type for conflict resolution */
  entityType?: string;
  /** Entity ID for conflict resolution */
  entityId?: string;
  /** Mutation key for deduplication */
  mutationKey?: string;
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;
  /** Server version/timestamp for conflict detection */
  serverVersion?: number;
}

export interface ConflictedMutation extends QueuedMutation {
  /** Server data at time of conflict */
  serverData: unknown;
  /** Conflict detected timestamp */
  conflictedAt: number;
  /** Human-readable description of conflict */
  conflictDescription?: string;
}

export interface MutationQueueState {
  version: number;
  mutations: QueuedMutation[];
  lastSyncAttempt: number | null;
  lastSuccessfulSync: number | null;
}

export interface ConflictQueueState {
  version: number;
  conflicts: ConflictedMutation[];
}

/**
 * Generate unique mutation ID
 */
function generateMutationId(): string {
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load queue from IndexedDB
 */
export async function loadMutationQueue(): Promise<MutationQueueState> {
  try {
    const stored = await get<MutationQueueState>(QUEUE_KEY);
    if (stored && stored.version === QUEUE_VERSION) {
      return stored;
    }
  } catch (error) {
    console.warn('[MutationQueue] Failed to load queue:', error);
  }

  return {
    version: QUEUE_VERSION,
    mutations: [],
    lastSyncAttempt: null,
    lastSuccessfulSync: null,
  };
}

/**
 * Save queue to IndexedDB
 */
export async function saveMutationQueue(state: MutationQueueState): Promise<void> {
  try {
    await set(QUEUE_KEY, state);
  } catch (error) {
    console.warn('[MutationQueue] Failed to save queue:', error);
  }
}

/**
 * Clear the mutation queue
 */
export async function clearMutationQueue(): Promise<void> {
  try {
    await del(QUEUE_KEY);
  } catch (error) {
    console.warn('[MutationQueue] Failed to clear queue:', error);
  }
}

/**
 * Load conflicts from IndexedDB
 */
export async function loadConflictQueue(): Promise<ConflictQueueState> {
  try {
    const stored = await get<ConflictQueueState>(CONFLICTS_KEY);
    if (stored && stored.version === QUEUE_VERSION) {
      return stored;
    }
  } catch (error) {
    console.warn('[MutationQueue] Failed to load conflicts:', error);
  }

  return {
    version: QUEUE_VERSION,
    conflicts: [],
  };
}

/**
 * Save conflicts to IndexedDB
 */
export async function saveConflictQueue(state: ConflictQueueState): Promise<void> {
  try {
    await set(CONFLICTS_KEY, state);
  } catch (error) {
    console.warn('[MutationQueue] Failed to save conflicts:', error);
  }
}

/**
 * Add a mutation to the conflict queue
 */
export async function addConflict(
  mutation: QueuedMutation,
  serverData: unknown,
  description?: string
): Promise<void> {
  const state = await loadConflictQueue();

  const conflictedMutation: ConflictedMutation = {
    ...mutation,
    serverData,
    conflictedAt: Date.now(),
    conflictDescription: description || `Conflict detected for ${mutation.entityType || 'item'}`,
  };

  // Replace existing conflict for same entity if exists
  const existingIndex = state.conflicts.findIndex(
    (c) => c.entityType === mutation.entityType && c.entityId === mutation.entityId
  );

  if (existingIndex !== -1) {
    state.conflicts[existingIndex] = conflictedMutation;
  } else {
    state.conflicts.push(conflictedMutation);
  }

  await saveConflictQueue(state);
}

/**
 * Get all pending conflicts
 */
export async function getConflicts(): Promise<ConflictedMutation[]> {
  const state = await loadConflictQueue();
  return state.conflicts;
}

/**
 * Get conflict count
 */
export async function getConflictCount(): Promise<number> {
  const state = await loadConflictQueue();
  return state.conflicts.length;
}

/**
 * Remove a conflict from the queue
 */
export async function removeConflict(mutationId: string): Promise<void> {
  const state = await loadConflictQueue();
  state.conflicts = state.conflicts.filter((c) => c.id !== mutationId);
  await saveConflictQueue(state);
}

/**
 * Clear all conflicts
 */
export async function clearConflicts(): Promise<void> {
  try {
    await del(CONFLICTS_KEY);
  } catch (error) {
    console.warn('[MutationQueue] Failed to clear conflicts:', error);
  }
}

/**
 * Resolve a conflict with a specific strategy
 */
export async function resolveConflict(
  mutationId: string,
  strategy: 'use-client' | 'use-server' | 'discard'
): Promise<{ success: boolean; error?: string }> {
  const state = await loadConflictQueue();
  const conflict = state.conflicts.find((c) => c.id === mutationId);

  if (!conflict) {
    return { success: false, error: 'Conflict not found' };
  }

  try {
    if (strategy === 'use-client') {
      // Retry the mutation with force flag
      const response = await fetch(conflict.endpoint, {
        method: conflict.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Update': 'true',
          ...conflict.headers,
        },
        body: JSON.stringify(conflict.body),
        credentials: 'include',
      });

      if (!response.ok) {
        return { success: false, error: `Failed to apply client changes: ${response.status}` };
      }
    }
    // 'use-server' and 'discard' just remove the conflict without action

    await removeConflict(mutationId);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add mutation to queue
 */
export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>
): Promise<string> {
  const state = await loadMutationQueue();

  const queuedMutation: QueuedMutation = {
    ...mutation,
    id: generateMutationId(),
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: mutation.maxRetries ?? 3,
  };

  // Check for duplicate mutation (same key, pending)
  if (mutation.mutationKey) {
    const existingIndex = state.mutations.findIndex(
      (m) => m.mutationKey === mutation.mutationKey
    );
    if (existingIndex !== -1) {
      // Replace existing mutation with newer one
      state.mutations[existingIndex] = queuedMutation;
      await saveMutationQueue(state);
      return queuedMutation.id;
    }
  }

  state.mutations.push(queuedMutation);
  await saveMutationQueue(state);

  // Notify service worker about new mutation
  notifyServiceWorker('MUTATION_QUEUED', { mutationId: queuedMutation.id });

  return queuedMutation.id;
}

/**
 * Remove mutation from queue
 */
export async function dequeueMutation(mutationId: string): Promise<void> {
  const state = await loadMutationQueue();
  state.mutations = state.mutations.filter((m) => m.id !== mutationId);
  await saveMutationQueue(state);
}

/**
 * Get pending mutation count
 */
export async function getPendingMutationCount(): Promise<number> {
  const state = await loadMutationQueue();
  return state.mutations.length;
}

/**
 * Process a single mutation with conflict handling
 */
export async function processMutation(
  mutation: QueuedMutation
): Promise<{ success: boolean; error?: string; conflict?: boolean; serverData?: unknown }> {
  try {
    // Add timestamp header for server-side conflict detection
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...mutation.headers,
    };

    if (mutation.serverVersion) {
      headers['If-Unmodified-Since'] = new Date(mutation.serverVersion).toUTCString();
    }

    const response = await fetch(mutation.endpoint, {
      method: mutation.method,
      headers,
      body: JSON.stringify(mutation.body),
      credentials: 'include',
    });

    if (response.ok) {
      return { success: true };
    }

    // Handle conflict (409)
    if (response.status === 409) {
      let serverData: unknown = null;
      try {
        serverData = await response.json();
      } catch {
        // Server didn't return conflict data
      }

      // Auto-resolve with configured strategy
      const strategy = mutation.conflictStrategy || 'manual';

      if (strategy === 'last-write-wins' || strategy === 'client-wins') {
        // Retry with force flag
        const forceResponse = await fetch(mutation.endpoint, {
          method: mutation.method,
          headers: {
            ...headers,
            'X-Force-Update': 'true',
          },
          body: JSON.stringify(mutation.body),
          credentials: 'include',
        });

        if (forceResponse.ok) {
          return { success: true };
        }
      } else if (strategy === 'server-wins') {
        // Discard client changes, accept server version
        return { success: true }; // Treat as success (we're accepting server state)
      }

      // Manual resolution required
      return { success: false, conflict: true, error: 'Conflict detected', serverData };
    }

    // Handle client errors (4xx) - don't retry
    if (response.status >= 400 && response.status < 500) {
      return { success: false, error: `Client error: ${response.status}` };
    }

    // Server error - can retry
    return { success: false, error: `Server error: ${response.status}` };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Process all queued mutations
 */
export async function processQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
}> {
  const state = await loadMutationQueue();

  if (state.mutations.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
  }

  state.lastSyncAttempt = Date.now();

  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;
  const remainingMutations: QueuedMutation[] = [];

  for (const mutation of state.mutations) {
    const result = await processMutation(mutation);

    if (result.success) {
      succeeded++;
    } else if (result.conflict) {
      conflicts++;
      // Move to conflict queue for manual resolution
      await addConflict(
        mutation,
        result.serverData,
        `Your changes to this ${mutation.entityType || 'item'} conflict with server data`
      );
    } else {
      mutation.retryCount++;

      if (mutation.retryCount < mutation.maxRetries) {
        // Keep for retry
        remainingMutations.push(mutation);
      } else {
        failed++;
      }
    }
  }

  state.mutations = remainingMutations;
  if (succeeded > 0) {
    state.lastSuccessfulSync = Date.now();
  }

  await saveMutationQueue(state);

  return {
    processed: state.mutations.length + succeeded + failed + conflicts,
    succeeded,
    failed,
    conflicts,
  };
}

/**
 * Notify service worker about mutation queue events
 */
function notifyServiceWorker(type: string, data: Record<string, unknown>): void {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type, ...data });
    });
  }
}

/**
 * Register background sync for mutation queue
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('mutation-queue-sync');
      return true;
    }
  } catch (error) {
    console.warn('[MutationQueue] Background sync not supported:', error);
  }

  return false;
}

/**
 * Create mutation cache with offline support
 */
export function createOfflineMutationCache(
  onMutationQueued?: (mutation: QueuedMutation) => void
): MutationCache {
  return new MutationCache({
    onError: async (error, variables, context, mutation) => {
      // Check if offline
      if (!navigator.onLine) {
        const mutationKey = mutation.options.mutationKey?.join(':');

        // Queue the mutation for later
        const queuedMutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'> = {
          endpoint: (mutation.options.mutationFn as { endpoint?: string })?.endpoint || '',
          method: 'POST',
          body: variables,
          maxRetries: 3,
          mutationKey,
        };

        const mutationId = await enqueueMutation(queuedMutation);

        if (onMutationQueued) {
          onMutationQueued({ ...queuedMutation, id: mutationId, timestamp: Date.now(), retryCount: 0 });
        }

        // Register background sync
        await registerBackgroundSync();
      }
    },
  });
}
