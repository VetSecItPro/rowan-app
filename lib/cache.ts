import { Redis } from '@upstash/redis';
import { logger } from './logger';

/**
 * Redis Cache Service
 *
 * Provides caching for expensive database queries and computations.
 * Falls back to no-cache behavior if Redis is not available.
 *
 * Cache TTL Guidelines:
 * - User session data: 5 minutes
 * - Statistics/analytics: 1-5 minutes
 * - Space member lists: 2 minutes
 * - Dashboard aggregations: 1 minute
 * - Configuration data: 10 minutes
 */

// Check if Redis environment variables are available
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis instance only if environment variables are available
const redis = hasRedisConfig ? Redis.fromEnv() : null;

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
  SPACE_STATS: 'space:stats:',
  SPACE_MEMBERS: 'space:members:',
  USER_SPACES: 'user:spaces:',
  DASHBOARD: 'dashboard:',
  ANALYTICS: 'analytics:',
  SPENDING: 'spending:',
  CALENDAR_STATS: 'calendar:stats:',
  TASK_STATS: 'task:stats:',
  REMINDER_STATS: 'reminder:stats:',
  CONVERSATIONS: 'conversations:',
  GOAL_STATS: 'goal:stats:',
  SUBSCRIPTION: 'subscription:',
  INVOICES: 'invoices:',
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for frequently changing data
  MEDIUM: 300,         // 5 minutes - for moderately stable data
  LONG: 600,           // 10 minutes - for stable data
  VERY_LONG: 3600,     // 1 hour - for rarely changing data
} as const;

/**
 * Get a cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(key);
    return cached;
  } catch (error) {
    logger.warn('Cache get failed', { component: 'lib-cache', action: 'get', key, error });
    return null;
  }
}

/**
 * Set a cached value with TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    logger.warn('Cache set failed', { component: 'lib-cache', action: 'set', key, ttlSeconds, error });
    return false;
  }
}

/**
 * Delete a cached value
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn('Cache delete failed', { component: 'lib-cache', action: 'delete', key, error });
    return false;
  }
}

/**
 * Delete all cached values matching a pattern
 * Useful for invalidating all cache entries for a space when data changes
 */
export async function deleteCachePattern(pattern: string): Promise<boolean> {
  if (!redis) return false;

  try {
    // Scan for keys matching the pattern
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result: [string, string[]] = await redis.scan(cursor, { match: pattern, count: 100 }) as [string, string[]];
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    // Delete all matching keys
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return true;
  } catch (error) {
    logger.warn('Cache delete pattern failed', { component: 'lib-cache', action: 'delete_pattern', pattern, error });
    return false;
  }
}

/**
 * Cache-aside pattern helper
 * Tries to get from cache, if not found executes the function and caches the result
 */
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM,
  onCacheHit?: () => void
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  if (cached !== null) {
    // Call the cache hit callback if provided
    if (onCacheHit) {
      onCacheHit();
    }
    return cached;
  }

  // Execute the fetch function
  const result = await fetchFn();

  // Cache the result (don't await, fire and forget)
  setCache(key, result, ttlSeconds).catch(() => {
    // Silently ignore cache set failures
  });

  return result;
}

/**
 * Invalidate cache for a specific space
 * Call this when space data is modified
 */
export async function invalidateSpaceCache(spaceId: string): Promise<void> {
  if (!redis) return;

  const patterns = [
    `${CACHE_PREFIXES.SPACE_STATS}${spaceId}*`,
    `${CACHE_PREFIXES.SPACE_MEMBERS}${spaceId}*`,
    `${CACHE_PREFIXES.DASHBOARD}${spaceId}*`,
    `${CACHE_PREFIXES.ANALYTICS}${spaceId}*`,
    `${CACHE_PREFIXES.SPENDING}${spaceId}*`,
    `${CACHE_PREFIXES.CALENDAR_STATS}${spaceId}*`,
    `${CACHE_PREFIXES.TASK_STATS}${spaceId}*`,
    `${CACHE_PREFIXES.REMINDER_STATS}${spaceId}*`,
    `${CACHE_PREFIXES.CONVERSATIONS}${spaceId}*`,
    `${CACHE_PREFIXES.GOAL_STATS}${spaceId}*`,
  ];

  await Promise.all(patterns.map(pattern => deleteCachePattern(pattern)));
}

/**
 * Invalidate cache for a specific user
 * Call this when user data is modified
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!redis) return;

  await deleteCachePattern(`${CACHE_PREFIXES.USER_SPACES}${userId}*`);
}

/**
 * Cache key generators for consistent key formatting
 */
export const cacheKeys = {
  spaceStats: (spaceId: string) => `${CACHE_PREFIXES.SPACE_STATS}${spaceId}`,
  spaceMembers: (spaceId: string) => `${CACHE_PREFIXES.SPACE_MEMBERS}${spaceId}`,
  userSpaces: (userId: string) => `${CACHE_PREFIXES.USER_SPACES}${userId}`,
  dashboard: (spaceId: string, section: string) => `${CACHE_PREFIXES.DASHBOARD}${spaceId}:${section}`,
  analytics: (spaceId: string, type: string, period: string) => `${CACHE_PREFIXES.ANALYTICS}${spaceId}:${type}:${period}`,
  spendingPatterns: (spaceId: string, months: number) => `${CACHE_PREFIXES.SPENDING}${spaceId}:patterns:${months}`,
  spendingTrends: (spaceId: string, months: number) => `${CACHE_PREFIXES.SPENDING}${spaceId}:trends:${months}`,
  calendarStats: (spaceId: string) => `${CACHE_PREFIXES.CALENDAR_STATS}${spaceId}`,
  taskStats: (spaceId: string) => `${CACHE_PREFIXES.TASK_STATS}${spaceId}`,
  reminderStats: (spaceId: string) => `${CACHE_PREFIXES.REMINDER_STATS}${spaceId}`,
  conversations: (spaceId: string, userId: string) => `${CACHE_PREFIXES.CONVERSATIONS}${spaceId}:${userId}`,
  goalStats: (spaceId: string) => `${CACHE_PREFIXES.GOAL_STATS}${spaceId}`,
  subscription: (userId: string) => `${CACHE_PREFIXES.SUBSCRIPTION}${userId}`,
  invoices: (customerId: string) => `${CACHE_PREFIXES.INVOICES}${customerId}`,
};

/**
 * Check if Redis cache is available
 */
export function isCacheAvailable(): boolean {
  return redis !== null;
}

// Export redis instance for advanced use cases
export { redis };
