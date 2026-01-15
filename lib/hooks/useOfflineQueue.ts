/**
 * Offline Action Queue Hook
 *
 * Queues mutations when offline and automatically syncs when connection is restored.
 * Uses localStorage for persistence across sessions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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

interface OfflineQueueState {
  queue: QueuedAction[];
  isProcessing: boolean;
  lastSyncAttempt: number | null;
  failedActions: QueuedAction[];
}

const STORAGE_KEY = 'rowan-offline-queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Hook for managing offline action queue
 */
export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    queue: [],
    isProcessing: false,
    lastSyncAttempt: null,
    failedActions: [],
  });
  const [isOnline, setIsOnline] = useState(true);
  const processingRef = useRef(false);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          queue: parsed.queue || [],
          failedActions: parsed.failedActions || [],
        }));
      } catch {
        // Invalid storage, reset
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist queue to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      queue: state.queue,
      failedActions: state.failedActions,
    }));
  }, [state.queue, state.failedActions]);

  // Process queue when online
  const processQueue = useCallback(async () => {
    if (!isOnline || state.queue.length === 0 || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true, lastSyncAttempt: Date.now() }));

    const newQueue = [...state.queue];
    const newFailedActions = [...state.failedActions];

    for (let i = 0; i < newQueue.length; i++) {
      const action = newQueue[i];

      try {
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(action.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Remove from queue on success
        newQueue.splice(i, 1);
        i--;
      } catch (error) {
        // Increment retry count
        action.retryCount++;

        if (action.retryCount >= action.maxRetries) {
          // Move to failed actions
          newQueue.splice(i, 1);
          newFailedActions.push(action);
          i--;
        } else {
          // Wait before next retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    setState(prev => ({
      ...prev,
      queue: newQueue,
      failedActions: newFailedActions,
      isProcessing: false,
    }));

    processingRef.current = false;
  }, [isOnline, state.queue, state.failedActions]);

  // Auto-process when coming online
  useEffect(() => {
    if (isOnline && state.queue.length > 0) {
      processQueue();
    }
  }, [isOnline, processQueue, state.queue.length]);

  // Add action to queue
  const enqueue = useCallback((
    type: string,
    endpoint: string,
    method: QueuedAction['method'],
    data: unknown
  ): string => {
    const id = crypto.randomUUID();

    const action: QueuedAction = {
      id,
      type,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, action],
    }));

    // If online, process immediately
    if (isOnline) {
      setTimeout(processQueue, 100);
    }

    return id;
  }, [isOnline, processQueue]);

  // Remove action from queue
  const dequeue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(a => a.id !== id),
    }));
  }, []);

  // Retry failed action
  const retryFailed = useCallback((id: string) => {
    setState(prev => {
      const failed = prev.failedActions.find(a => a.id === id);
      if (!failed) return prev;

      return {
        ...prev,
        queue: [...prev.queue, { ...failed, retryCount: 0 }],
        failedActions: prev.failedActions.filter(a => a.id !== id),
      };
    });
  }, []);

  // Clear all failed actions
  const clearFailed = useCallback(() => {
    setState(prev => ({ ...prev, failedActions: [] }));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [], failedActions: [] }));
  }, []);

  return {
    queue: state.queue,
    failedActions: state.failedActions,
    isProcessing: state.isProcessing,
    lastSyncAttempt: state.lastSyncAttempt,
    isOnline,
    pendingCount: state.queue.length,
    failedCount: state.failedActions.length,
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
import { createContext, useContext } from 'react';

export interface OfflineQueueContextValue {
  pendingCount: number;
  failedCount: number;
  isProcessing: boolean;
  isOnline: boolean;
  enqueue: (type: string, endpoint: string, method: QueuedAction['method'], data: unknown) => string;
}

export const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

export function useOfflineQueueContext() {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueueContext must be used within OfflineQueueProvider');
  }
  return context;
}
