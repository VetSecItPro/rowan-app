/**
 * Admin Cache Service
 *
 * Server-side caching for admin dashboard data using Upstash Redis.
 * Reduces database load and improves admin page response times.
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Check if Redis environment variables are available
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis instance only if environment variables are available
const redis = hasRedisConfig ? Redis.fromEnv() : null;

// Cache key prefixes
const CACHE_PREFIX = 'rowan:admin:';

// Cache TTLs (in seconds)
// Optimized for admin dashboard performance - aggressive caching since admin data changes infrequently
const CACHE_TTL = {
  dashboardStats: 300,     // 5 minutes for dashboard stats (rarely changes)
  usersList: 600,          // 10 minutes for users list (infrequent updates)
  betaRequests: 600,       // 10 minutes for beta requests (infrequent updates)
  analytics: 900,          // 15 minutes for analytics (expensive queries, historical data)
  betaStats: 300,          // 5 minutes for beta stats
  notificationStats: 300,  // 5 minutes for notification stats
  subscriptionAnalytics: 600, // 10 minutes for subscription metrics (revenue data)
} as const;

interface CacheOptions {
  ttl?: number;
  skipCache?: boolean;
}

/**
 * Get cached data from Redis
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get<T>(`${CACHE_PREFIX}${key}`);
    return cached;
  } catch (error) {
    logger.warn('Redis cache get failed:', { component: 'lib-admin-cache-service', error: error });
    return null;
  }
}

/**
 * Set cached data in Redis with TTL
 */
export async function setCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(`${CACHE_PREFIX}${key}`, ttlSeconds, data);
  } catch (error) {
    logger.warn('Redis cache set failed:', { component: 'lib-admin-cache-service', error: error });
  }
}

/**
 * Invalidate a specific cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    logger.warn('Redis cache invalidation failed:', { component: 'lib-admin-cache-service', error: error });
  }
}

/**
 * Invalidate all admin cache keys matching a pattern
 */
export async function invalidateAdminCache(): Promise<void> {
  if (!redis) return;

  try {
    // Get all admin cache keys
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.warn('Redis admin cache invalidation failed:', { component: 'lib-admin-cache-service', error: error });
  }
}

/**
 * Cache wrapper for async functions
 * Returns cached data if available, otherwise executes function and caches result
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 60, skipCache = false } = options;

  // Skip cache if requested
  if (skipCache) {
    return fn();
  }

  // Try to get cached data
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  await setCache(key, result, ttl);
  return result;
}

// Export cache TTL constants for consistent usage
export const ADMIN_CACHE_TTL = CACHE_TTL;

// Export cache keys for dashboard
export const ADMIN_CACHE_KEYS = {
  dashboardStats: 'dashboard:stats',
  usersList: (page: number, limit: number) => `users:list:${page}:${limit}`,
  betaRequests: (page: number, status: string | null) => `beta:requests:${page}:${status || 'all'}`,
  analytics: (range: string) => `analytics:${range}`,
  betaStats: 'beta:stats',
  notificationStats: 'notifications:stats',
  subscriptionMetrics: 'subscriptions:metrics',
  subscriptionEvents: (eventType: string | null, limit: number, offset: number) =>
    `subscriptions:events:${eventType || 'all'}:${limit}:${offset}`,
  dailyRevenue: (days: number) => `subscriptions:revenue:${days}d`,
  retention: (range: string) => `retention:${range}`,
  acquisition: (range: string) => `acquisition:${range}`,
} as const;
