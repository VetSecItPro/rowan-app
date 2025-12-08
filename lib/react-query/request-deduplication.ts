/**
 * Request Deduplication Layer
 *
 * Enhanced deduplication for high-frequency operations beyond React Query's built-in deduplication
 * Provides throttling, batching, and intelligent request consolidation
 */

import { queryClient, QUERY_KEYS, intelligentInvalidation } from './query-client';

/**
 * Request throttling for user-triggered actions
 * Prevents excessive API calls from rapid user interactions
 */
class RequestThrottler {
  private pendingRequests = new Map<string, Promise<any>>();
  private throttledActions = new Map<string, number>();
  private readonly THROTTLE_DELAY = 300; // 300ms throttle

  /**
   * Throttles rapid successive calls to the same action
   */
  async throttle<T>(key: string, action: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const lastCall = this.throttledActions.get(key);

    // If we called this recently, wait for the throttle period
    if (lastCall && now - lastCall < this.THROTTLE_DELAY) {
      const existing = this.pendingRequests.get(key);
      if (existing) {
        return existing;
      }

      // Delay the new request
      await new Promise(resolve =>
        setTimeout(resolve, this.THROTTLE_DELAY - (now - lastCall))
      );
    }

    // Check if there's already a pending request for this key
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Create new request and track it
    this.throttledActions.set(key, Date.now());
    const request = action().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Clear throttling for a specific action
   */
  clearThrottle(key: string): void {
    this.pendingRequests.delete(key);
    this.throttledActions.delete(key);
  }

  /**
   * Clear all throttled requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
    this.throttledActions.clear();
  }
}

/**
 * Request batcher for consolidating related API calls
 * Groups related requests to reduce server load
 */
class RequestBatcher {
  private batchQueues = new Map<string, {
    requests: Array<{id: string, resolve: (value: any) => void, reject: (error: any) => void}>;
    timeout: NodeJS.Timeout;
  }>();

  private readonly BATCH_DELAY = 50; // 50ms batch window
  private readonly MAX_BATCH_SIZE = 10;

  /**
   * Batch related requests together
   */
  async batch<T>(
    batchKey: string,
    requestId: string,
    batchExecutor: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batchQueues.get(batchKey);

      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey, batchExecutor), this.BATCH_DELAY)
        };
        this.batchQueues.set(batchKey, batch);
      }

      batch.requests.push({ id: requestId, resolve, reject });

      // Execute immediately if batch is full
      if (batch.requests.length >= this.MAX_BATCH_SIZE) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey, batchExecutor);
      }
    });
  }

  private async executeBatch<T>(
    batchKey: string,
    batchExecutor: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<void> {
    const batch = this.batchQueues.get(batchKey);
    if (!batch) return;

    this.batchQueues.delete(batchKey);
    const { requests } = batch;

    try {
      const ids = requests.map(req => req.id);
      const results = await batchExecutor(ids);

      // Resolve individual promises with their results
      requests.forEach(({ id, resolve, reject }) => {
        if (id in results) {
          resolve(results[id]);
        } else {
          reject(new Error(`No result for request ${id}`));
        }
      });
    } catch (error) {
      // Reject all promises in the batch
      requests.forEach(({ reject }) => reject(error));
    }
  }
}

/**
 * Global throttler and batcher instances
 */
export const requestThrottler = new RequestThrottler();
export const requestBatcher = new RequestBatcher();

/**
 * Deduplication helpers for common operations
 */
export const deduplicatedRequests = {
  /**
   * Throttled space switching to prevent rapid switching
   */
  async switchSpace(userId: string, spaceId: string, switchFn: () => Promise<any>) {
    const key = `switch-space-${userId}-${spaceId}`;
    return requestThrottler.throttle(key, switchFn);
  },

  /**
   * Throttled profile updates to prevent rapid saves
   */
  async updateProfile(userId: string, updateFn: () => Promise<any>) {
    const key = `update-profile-${userId}`;
    return requestThrottler.throttle(key, updateFn);
  },

  /**
   * Batched space member fetching
   */
  async getSpaceMembers(spaceIds: string[]): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};

    // Use Promise.all for concurrent requests, but with intelligent deduplication
    const uniqueSpaceIds = [...new Set(spaceIds)];
    const promises = uniqueSpaceIds.map(async (spaceId) => {
      const key = `space-members-${spaceId}`;

      // Check if data is already cached and fresh
      const cached = queryClient.getQueryData(QUERY_KEYS.spaces.members(spaceId));
      if (cached) {
        return { spaceId, members: cached };
      }

      // Otherwise, fetch with deduplication
      const members = await requestThrottler.throttle(key, async () => {
        const { data } = await queryClient.ensureQueryData({
          queryKey: QUERY_KEYS.spaces.members(spaceId),
          queryFn: async () => {
            // This would call your actual API
            throw new Error('Implement actual space members API call');
          }
        });
        return data;
      });

      return { spaceId, members };
    });

    const resolved = await Promise.all(promises);
    resolved.forEach(({ spaceId, members }) => {
      results[spaceId] = Array.isArray(members) ? members : [];
    });

    return results;
  },

  /**
   * Intelligent cache invalidation with deduplication
   */
  async invalidateUserData(userId: string): Promise<void> {
    const key = `invalidate-user-${userId}`;
    return requestThrottler.throttle(key, async () => {
      await intelligentInvalidation.userData(userId);
    });
  },

  /**
   * Coordinated space data refresh with request consolidation
   */
  async refreshSpaceData(userId: string, spaceId?: string): Promise<void> {
    const key = spaceId ? `refresh-space-${spaceId}` : `refresh-all-spaces-${userId}`;

    return requestThrottler.throttle(key, async () => {
      if (spaceId) {
        // Refresh specific space data with intelligent invalidation
        await intelligentInvalidation.space(spaceId, userId);
      } else {
        // Refresh all user's space data
        await intelligentInvalidation.spaces(userId);
      }
    });
  }
};

/**
 * React hook for automatic request deduplication cleanup
 */
export function useRequestDeduplication() {
  // Cleanup on unmount (this would be used in components)
  const cleanup = () => {
    // Optionally clear throttled requests for this component
    // Could be extended to track component-specific throttles
  };

  return {
    throttle: requestThrottler.throttle.bind(requestThrottler),
    batch: requestBatcher.batch.bind(requestBatcher),
    cleanup
  };
}

/**
 * Development utilities for monitoring request deduplication
 */
export const deduplicationDevtools = {
  /**
   * Get current throttled requests count
   */
  getThrottledCount(): number {
    return (requestThrottler as any).pendingRequests.size;
  },

  /**
   * Get current batched requests count
   */
  getBatchedCount(): number {
    return (requestBatcher as any).batchQueues.size;
  },

  /**
   * Clear all deduplication state (useful for testing)
   */
  clearAll(): void {
    requestThrottler.clearAll();
    (requestBatcher as any).batchQueues.clear();
  }
};

/**
 * Configuration for request deduplication behavior
 */
export const DEDUPLICATION_CONFIG = {
  // Throttle delays for different action types
  THROTTLE_DELAYS: {
    SPACE_SWITCH: 300,    // 300ms
    PROFILE_UPDATE: 1000, // 1s
    SEARCH: 300,          // 300ms
    FILTER: 200,          // 200ms
  },

  // Batch configuration
  BATCH_CONFIG: {
    DELAY: 50,           // 50ms batch window
    MAX_SIZE: 10,        // Max requests per batch
  }
} as const;