import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import LRUCache from 'lru-cache';

// Configure Redis for Upstash
const redis = Redis.fromEnv();

// Fallback cache for when Redis is unavailable
const fallbackCache = new LRUCache<string, number>({
  max: 1000, // Max number of entries
  ttl: 60 * 1000 * 10, // 10 minutes TTL
});

/**
 * Specific rate limiter for shopping list token access attempts
 * More restrictive to prevent token enumeration attacks
 * 5 attempts per IP per minute
 */
export const shoppingTokenRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'shopping_token_access',
});

/**
 * Check rate limit for shopping list token access with fallback
 */
export async function checkShoppingTokenRateLimit(ip: string): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: Date }> {
  try {
    return await shoppingTokenRateLimit.limit(ip);
  } catch (error) {
    console.warn('Shopping token rate limit fallback - Redis unavailable:', error);

    // Fallback to in-memory cache
    const key = `shopping_token_${ip}`;
    const now = Date.now();
    const attempts = fallbackCache.get(key) || 0;

    // Allow 5 attempts per 10 minutes (more conservative fallback)
    if (attempts >= 5) {
      return {
        success: false,
        limit: 5,
        remaining: 0,
        reset: new Date(now + 60 * 1000 * 10)
      };
    }

    fallbackCache.set(key, attempts + 1);
    return {
      success: true,
      limit: 5,
      remaining: 5 - attempts - 1
    };
  }
}

/**
 * Generate a cryptographically secure share token
 * Uses crypto.randomBytes for maximum security
 */
export function generateSecureShareToken(): string {
  const { randomBytes } = require('crypto');
  // Generate 32 random bytes and encode as URL-safe base64
  return randomBytes(32).toString('base64url');
}