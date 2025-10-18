import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { fallbackRateLimit } from './ratelimit-fallback';

// Check if Redis environment variables are available
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis instance only if environment variables are available
const redis = hasRedisConfig ? Redis.fromEnv() : null;

// Create a new ratelimit instance
export const ratelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'rowan',
}) : null;

// Rate limit for API routes: 10 requests per 10 seconds
export const apiRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'rowan:api',
}) : null;

// Rate limit for authentication: 5 requests per hour (stricter)
export const authRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'rowan:auth',
}) : null;

/**
 * Helper function to check rate limits with automatic fallback
 * Uses Redis if available, otherwise falls back to in-memory rate limiting
 */
export async function checkRateLimit(
  ip: string,
  rateLimiter: typeof ratelimit | typeof apiRateLimit | typeof authRateLimit,
  fallbackLimit: number = 10,
  fallbackWindowMs: number = 10000
): Promise<{ success: boolean }> {
  // If Redis rate limiter is available, use it
  if (rateLimiter) {
    try {
      return await rateLimiter.limit(ip);
    } catch (error) {
      console.warn('Redis rate limiter failed, falling back to in-memory:', error);
      // Fall through to fallback
    }
  }

  // Use fallback rate limiting
  const allowed = fallbackRateLimit(ip, fallbackLimit, fallbackWindowMs);
  return { success: allowed };
}

/**
 * General rate limit: 10 requests per 10 seconds
 */
export async function checkGeneralRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, ratelimit, 10, 10000);
}

/**
 * API rate limit: 10 requests per 10 seconds
 */
export async function checkApiRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, apiRateLimit, 10, 10000);
}

/**
 * Authentication rate limit: 5 requests per hour
 */
export async function checkAuthRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, authRateLimit, 5, 3600000); // 1 hour = 3600000ms
}
