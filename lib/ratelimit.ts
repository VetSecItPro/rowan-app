/**
 * Rate Limiting (Upstash Redis primary + in-memory fallback)
 *
 * Redis is the source of truth — only it gives us correct cross-instance counts
 * across Vercel's serverless fan-out. The in-memory fallback in ratelimit-fallback.ts
 * triggers ONLY when Redis env vars are absent (local dev) OR when a Redis call
 * throws (Upstash outage). Fallback counts are per-instance, so during outages
 * the effective limit scales with concurrent serverless instances — accepted as
 * graceful degradation vs blocking all traffic.
 *
 * Tier-specific limiters (AI chat Pro vs Family) are keyed by userId, not IP,
 * because abuse targets per-account spend, not per-IP throughput.
 */

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

// Free-tier teaser daily cap (Phase 10.7). MUST stay an ATOMIC limiter rather
// than a SELECT-count: the count-then-act version had a TOCTOU race where N
// concurrent requests each read <3 prior messages and all passed (sec-ship
// 2026-06-05). Redis INCR can't be raced. Keep `3` in sync with
// FREE_DAILY_AI_MESSAGES (conversation-persistence-service.ts).
export const aiChatRateLimitFree = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  analytics: true,
  prefix: 'rowan:ai:chat:free-daily',
}) : null;

/**
 * Atomically reserve one of a free user's 3 daily AI messages. Returns
 * { success:false } once the cap is hit. Consumed only on actual AI-consuming
 * requests (chat/briefing), never on display/metadata reads.
 */
export async function checkFreeAIDailyLimit(userId: string): Promise<{ success: boolean }> {
  return checkRateLimit(userId, aiChatRateLimitFree, 3, 24 * 60 * 60 * 1000);
}

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
 * Check a rate limit with Redis-then-fallback semantics.
 *
 * Returns `{ success: true }` even on Redis errors (we degrade to per-instance
 * in-memory counts) — the only failure mode that returns `success: false` is
 * the user actually exceeding the limit. Callers must NOT treat a thrown
 * exception as "rate limited"; this function never throws.
 */
export async function checkRateLimit(
  ip: string,
  rateLimiter: typeof ratelimit | typeof apiRateLimit | typeof authRateLimit,
  fallbackLimit: number = 10,
  fallbackWindowMs: number = 10000
): Promise<{ success: boolean }> {
  // E2E test bypass: every Playwright test fires dozens of API calls from a
  // single CI runner IP. Per-IP limits (10/10s on general, 10/h on auth)
  // exhaust quickly across a 95-test suite — the resulting 429s on
  // /api/csrf/token were misread as "session invalid", triggering UI re-auth
  // fallbacks that compounded into the broken-baseline pattern (red since
  // 2026-02-11). PLAYWRIGHT_TEST is set ONLY by playwright.config.ts's
  // webServer.env block, so this gate cannot fire in real production.
  if (process.env.PLAYWRIGHT_TEST === 'true') {
    return { success: true };
  }

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
 * CSRF token rate limit: 100 requests per 10 seconds.
 *
 * CSRF token issuance is not security-sensitive — the token is meant to be
 * widely distributed within a session and verified on state-changing requests.
 * The general rate limit (10/10s) collides with shared-IP environments where
 * multiple authenticated clients legitimately fetch tokens (parallel CI test
 * workers, NAT'd corporate networks, mobile carrier-grade NAT). This higher
 * cap still bounds runaway-client abuse but doesn't punish concurrency.
 */
export async function checkCsrfTokenRateLimit(ip: string): Promise<{ success: boolean }> {
  return checkRateLimit(ip, ratelimit, 100, 10000);
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
