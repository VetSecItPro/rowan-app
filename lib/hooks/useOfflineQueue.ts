/**
 * Offline Action Queue Hook
 *
 * Thin React wrapper over MutationQueueManager singleton.
 * Provides reactive state updates and backward-compatible API.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { MutationQueueManager, type QueuedMutation } from '@/lib/queue/mutation-queue-manager';

/**
 * Legacy interface kept for backward compatibility with NetworkStatus.tsx
 * and any consumers importing QueuedAction.
 */
export interface QueuedAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * Convert QueuedMutation (new format) to QueuedAction (legacy format)
 */
function toQueuedAction(m: QueuedMutation): QueuedAction {
  let data: unknown;
  try {
    data = m.body ? JSON.parse(m.body) : undefined;
  } catch {
    data = m.body;
  }

  return {
    id: m.id,
    type: m.method,
    endpoint: m.url,
    method: m.method,
    data,
    timestamp: m.timestamp,
    retryCount: m.retryCount,
    maxRetries: m.maxRetries,
  };
}

/**
 * Hook for managing offline action queue.
 * Returns the same shape as before for full backward compatibility.
 */
export function useOfflineQueue() {
  const manager = MutationQueueManager.getInstance();
  const initial = manager.getState();

  const [queue, setQueue] = useState(initial.queue);
  const [failedActions, setFailedActions] = useState(initial.failedActions);
  const [isProcessing, setIsProcessing] = useState(initial.isProcessing);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Subscribe to manager state changes
  useEffect(() => {
    const unsubscribe = manager.subscribe((state) => {
      setQueue(state.queue);
      setFailedActions(state.failedActions);
      setIsProcessing(state.isProcessing);
    });

    return unsubscribe;
  }, [manager]);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-process queue when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      manager.processQueue();
    }
  }, [isOnline, queue.length, manager]);

  const enqueue = useCallback(
    (type: string, endpoint: string, method: QueuedAction['method'], data: unknown): string => {
      const body = data !== undefined ? JSON.stringify(data) : undefined;
      return manager.enqueue(endpoint, method, { 'Content-Type': 'application/json' }, body);
    },
    [manager]
  );

  const dequeue = useCallback((id: string) => manager.dequeue(id), [manager]);
  const retryFailed = useCallback((id: string) => manager.retryFailed(id), [manager]);
  const clearFailed = useCallback(() => manager.clearFailed(), [manager]);
  const clearQueue = useCallback(() => manager.clearQueue(), [manager]);
  const processQueue = useCallback(() => manager.processQueue(), [manager]);

  // Convert to legacy format for backward compat
  const legacyQueue = queue.map(toQueuedAction);
  const legacyFailed = failedActions.map(toQueuedAction);

  return {
    queue: legacyQueue,
    failedActions: legacyFailed,
    isProcessing,
    lastSyncAttempt: null as number | null,
    isOnline,
    pendingCount: queue.length,
    failedCount: failedActions.length,
    enqueue,
    dequeue,
    retryFailed,
    clearFailed,
    clearQueue,
    processQueue,
  };
}

/**
 * Context for global offline queue access
 */
export interface OfflineQueueContextValue {
  pendingCount: number;
  failedCount: number;
  isProcessing: boolean;
  isOnline: boolean;
  enqueue: (type: string, endpoint: string, method: QueuedAction['method'], data: unknown) => string;
}

/** React context for the offline action queue provider */
export const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

/** Consumes the OfflineQueueContext and throws if used outside the provider */
export function useOfflineQueueContext() {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueueContext must be used within OfflineQueueProvider');
  }
  return context;
}
