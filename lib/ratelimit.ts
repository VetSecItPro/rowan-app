import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { fallbackRateLimit } from './ratelimit-fallback';
import { logger } from '@/lib/logger';

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

// Rate limit for authentication: 10 requests per hour
export const authRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true,
  prefix: 'rowan:auth',
}) : null;

// Rate limit for MFA operations: 10 requests per 15 minutes (moderate, prevents brute force)
export const mfaRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  analytics: true,
  prefix: 'rowan:mfa',
}) : null;

// Rate limit for expensive operations (bulk, exports): 5 requests per hour
export const expensiveOperationRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'rowan:expensive',
}) : null;

// Rate limit for sensitive operations (account deletion, data export): 3 requests per day
export const sensitiveOperationRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  analytics: true,
  prefix: 'rowan:sensitive',
}) : null;

// ---------------------------------------------------------------------------
// AI per-user rate limiters (keyed by userId, not IP)
// ---------------------------------------------------------------------------

// AI chat: Pro = 20 msg/min, Family = 30 msg/min
export const aiChatRateLimitPro = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'rowan:ai:chat:pro',
}) : null;

export const aiChatRateLimitFamily = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'rowan:ai:chat:family',
}) : null;

// AI briefing: 1 per hour per user (across all tiers)
export const aiBriefingRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1 h'),
  analytics: true,
  prefix: 'rowan:ai:briefing',
}) : null;

// AI suggestions: 10 per hour per user (across all tiers)
export const aiSuggestionsRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  analytics: true,
  prefix: 'rowan:ai:suggestions',
}) : null;

/**
 * Check AI chat rate limit by user ID and tier.
 * Returns { success } — false if user is sending too fast.
 */
export async function checkAIChatRateLimit(
  userId: string,
  tier: string
): Promise<{ success: boolean }> {
  const limiter = tier === 'family' ? aiChatRateLimitFamily : aiChatRateLimitPro;
  return checkRateLimit(userId, limiter, tier === 'family' ? 30 : 20, 60000);
}

/**
 * Check AI briefing rate limit by user ID.
 */
export async function checkAIBriefingRateLimit(
  userId: string
): Promise<{ success: boolean }> {
  return checkRateLimit(userId, aiBriefingRateLimit, 1, 3600000);
}

/**
 * Check AI suggestions rate limit by user ID.
 */
export async function checkAISuggestionsRateLimit(
  userId: string
): Promise<{ success: boolean }> {
  return checkRateLimit(userId, aiSuggestionsRateLimit, 30, 3600000);
}

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
      logger.warn('Redis rate limiter failed, falling back to in-memory', { component: 'lib-ratelimit', error: error instanceof Error ? error.message : 'Unknown error' });
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
 * Authentication rate limit: 10 requests per hour
 */
export async function checkAuthRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, authRateLimit, 10, 3600000); // 1 hour = 3600000ms
}

/**
 * MFA rate limit: 10 requests per 15 minutes
 */
export async function checkMfaRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, mfaRateLimit, 10, 900000); // 15 minutes = 900000ms
}

/**
 * Expensive operation rate limit: 5 requests per hour
 */
export async function checkExpensiveOperationRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, expensiveOperationRateLimit, 5, 3600000); // 1 hour
}

/**
 * Sensitive operation rate limit: 3 requests per day
 */
export async function checkSensitiveOperationRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, sensitiveOperationRateLimit, 3, 86400000); // 24 hours
}
