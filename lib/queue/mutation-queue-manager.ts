/**
 * Mutation Queue Manager
 *
 * Standalone singleton that manages offline mutation queueing.
 * No React dependency — consumed by csrfFetch and wrapped by useOfflineQueue hook.
 *
 * Features:
 * - Enqueue mutations when offline or on network error
 * - Deduplication (url + method + body)
 * - Exponential backoff with jitter on retry
 * - Stale mutation pruning (24h)
 * - 409 conflict handling (remove without retry)
 * - React Query invalidation after successful sync
 * - Service Worker background sync mirror
 * - Multi-tab safety via storage event listener
 */

export interface QueuedMutation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body: string | undefined;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface QueueState {
  queue: QueuedMutation[];
  failedActions: QueuedMutation[];
}

type Listener = (state: QueueState & { isProcessing: boolean }) => void;

const STORAGE_KEY = 'rowan-offline-queue';
const MAX_RETRIES = 5;
const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Map API endpoint prefixes to React Query cache keys for invalidation
 */
const ENDPOINT_QUERY_KEY_MAP: Record<string, string[]> = {
  '/api/tasks': ['tasks'],
  '/api/messages': ['messages'],
  '/api/shopping': ['shopping'],
  '/api/calendar': ['calendar'],
  '/api/reminders': ['reminders'],
  '/api/goals': ['goals'],
  '/api/meals': ['meals'],
  '/api/recipes': ['meals'],
  '/api/budget': ['budgets'],
  '/api/chores': ['chores'],
  '/api/checkins': ['checkins'],
  '/api/spaces': ['spaces'],
  '/api/notifications': ['notifications'],
};

export class MutationQueueManager {
  private static instance: MutationQueueManager | null = null;

  private state: QueueState = { queue: [], failedActions: [] };
  private isProcessing = false;
  private listeners = new Set<Listener>();
  private processingPromise: Promise<void> | null = null;
  private csrfRefreshPromise: Promise<string | null> | null = null;

  private constructor() {
    this.loadFromStorage();
    this.listenForStorageChanges();
    this.discardStale();
  }

  static getInstance(): MutationQueueManager {
    if (!MutationQueueManager.instance) {
      MutationQueueManager.instance = new MutationQueueManager();
    }
    return MutationQueueManager.instance;
  }

  // --- Public API ---

  getState() {
    return {
      queue: this.state.queue,
      failedActions: this.state.failedActions,
      isProcessing: this.isProcessing,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  enqueue(
    url: string,
    method: QueuedMutation['method'],
    headers: Record<string, string>,
    body: string | undefined
  ): string {
    // Dedup check
    const existingId = this.isDuplicate(url, method, body);
    if (existingId) return existingId;

    const mutation: QueuedMutation = {
      id: crypto.randomUUID(),
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    this.state.queue.push(mutation);
    this.persist();
    this.mirrorToSW();
    this.notify();

    return mutation.id;
  }

  dequeue(id: string): void {
    this.state.queue = this.state.queue.filter((m) => m.id !== id);
    this.persist();
    this.notify();
  }

  retryFailed(id: string): void {
    const idx = this.state.failedActions.findIndex((m) => m.id === id);
    if (idx === -1) return;

    const mutation = { ...this.state.failedActions[idx], retryCount: 0 };
    this.state.failedActions.splice(idx, 1);
    this.state.queue.push(mutation);
    this.persist();
    this.notify();
  }

  clearFailed(): void {
    this.state.failedActions = [];
    this.persist();
    this.notify();
  }

  clearQueue(): void {
    this.state.queue = [];
    this.state.failedActions = [];
    this.persist();
    this.notify();
  }

  async processQueue(): Promise<void> {
    if (this.state.queue.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    // If already processing, return the existing promise to avoid concurrent runs
    if (this.processingPromise) return this.processingPromise;

    this.isProcessing = true;
    this.notify();

    // Assign promise immediately (synchronously) to prevent race between callers
    this.processingPromise = this.doProcessQueue().finally(() => {
      this.processingPromise = null;
      this.isProcessing = false;
      this.notify();
    });

    return this.processingPromise;
  }

  // --- Internal ---

  private async doProcessQueue(): Promise<void> {
    // Discard stale mutations before processing
    this.discardStale();

    // Process in order; items may be removed during iteration
    let i = 0;
    while (i < this.state.queue.length) {
      const mutation = this.state.queue[i];

      try {
        // Re-fetch CSRF token for each replayed request
        const freshHeaders = await this.refreshCsrfHeader(mutation.headers);

        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: freshHeaders,
          body: mutation.body,
          credentials: 'include',
        });

        if (response.ok) {
          // Success — remove from queue and invalidate relevant cache
          this.state.queue.splice(i, 1);
          this.invalidateQueriesForEndpoint(mutation.url);
          // Don't increment i — next item shifts into current index
          continue;
        }

        if (response.status === 409) {
          // Conflict — server state changed, move to failed so user can see what was lost
          const conflicted = this.state.queue.splice(i, 1)[0];
          this.state.failedActions.push({ ...conflicted, retryCount: conflicted.maxRetries });
          continue;
        }

        // Other server errors — treat as failure
        throw new Error(`HTTP ${response.status}`);
      } catch {
        mutation.retryCount++;

        if (mutation.retryCount >= mutation.maxRetries) {
          // Move to failed
          this.state.queue.splice(i, 1);
          this.state.failedActions.push(mutation);
          // Don't increment i
          continue;
        }

        // Exponential backoff with jitter before next retry
        const delay = Math.min(1000 * 2 ** mutation.retryCount, 30000) + Math.random() * 1000;
        await new Promise((r) => setTimeout(r, delay));
        i++;
      }
    }

    this.persist();
  }

  private isDuplicate(
    url: string,
    method: QueuedMutation['method'],
    body: string | undefined
  ): string | null {
    const match = this.state.queue.find(
      (m) => m.url === url && m.method === method && m.body === body
    );
    return match?.id ?? null;
  }

  private discardStale(): void {
    const now = Date.now();
    const stale: QueuedMutation[] = [];
    this.state.queue = this.state.queue.filter((m) => {
      if (now - m.timestamp > STALE_THRESHOLD) {
        stale.push(m);
        return false;
      }
      return true;
    });

    if (stale.length > 0) {
      this.state.failedActions.push(...stale);
      this.persist();
    }
  }

  private async refreshCsrfToken(): Promise<string | null> {
    if (this.csrfRefreshPromise) return this.csrfRefreshPromise;

    this.csrfRefreshPromise = (async (): Promise<string | null> => {
      try {
        const response = await fetch('/api/csrf/token', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.token) {
            sessionStorage.setItem('csrf_token', data.token);
            return data.token;
          }
        }
      } catch {
        // If we can't refresh, caller uses the existing header
      }
      return null;
    })();

    try {
      return await this.csrfRefreshPromise;
    } finally {
      this.csrfRefreshPromise = null;
    }
  }

  private async refreshCsrfHeader(
    headers: Record<string, string>
  ): Promise<Record<string, string>> {
    const token = await this.refreshCsrfToken();
    if (token) {
      return { ...headers, 'x-csrf-token': token };
    }
    return headers;
  }

  private invalidateQueriesForEndpoint(url: string): void {
    // Lazy import to avoid circular dependency — queryClient may not be initialized yet
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { queryClient } = require('@/lib/react-query/query-client');

      const matchedKey = Object.entries(ENDPOINT_QUERY_KEY_MAP).find(([prefix]) =>
        url.startsWith(prefix)
      );

      if (matchedKey) {
        queryClient.invalidateQueries({ queryKey: matchedKey[1] });
      } else {
        // Unknown endpoint — broad invalidation
        queryClient.invalidateQueries();
      }
    } catch {
      // queryClient not available (e.g. SSR) — skip
    }
  }

  private async mirrorToSW(): Promise<void> {
    try {
      // Direct SW communication — avoids importing the barrel file
      // which re-exports client-only hooks
      if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;

      const data = {
        queue: this.state.queue,
        failedActions: this.state.failedActions,
      };

      // Cache queue data to SW
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DATA',
        key: 'offline-queue',
        value: data,
      });

      // Request background sync if supported
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        // @ts-expect-error - BackgroundSync API types not fully supported
        await registration.sync.register('offline-queue-sync');
      }
    } catch {
      // SW not available — localStorage is primary storage
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state.queue = parsed.queue || [];
        this.state.failedActions = parsed.failedActions || [];
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          queue: this.state.queue,
          failedActions: this.state.failedActions,
        })
      );
    } catch (error) {
      // localStorage full or unavailable — warn so developers can diagnose
      const isQuota =
        error instanceof DOMException &&
        (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError');
      console.warn(
        `[MutationQueue] Failed to persist queue${isQuota ? ' (storage quota exceeded)' : ''}:`,
        error
      );
    }
  }

  private listenForStorageChanges(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.loadFromStorage();
        this.notify();
      }
    });
  }

  private notify(): void {
    const snapshot = {
      queue: this.state.queue,
      failedActions: this.state.failedActions,
      isProcessing: this.isProcessing,
    };
    this.listeners.forEach((fn) => fn(snapshot));
  }
}
