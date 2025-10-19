/**
 * In-Memory Fallback Rate Limiter
 *
 * Provides rate limiting when Redis (Upstash) is unavailable.
 * Uses LRU cache with automatic cleanup.
 *
 * Security: Prevents unlimited requests during Redis outages.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple in-memory cache (no external dependencies)
class MemoryCache {
  private cache = new Map<string, RateLimitEntry>();
  private maxSize = 10000; // Track up to 10k IPs
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: RateLimitEntry): void {
    // Simple LRU: Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.resetAt < now) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

const fallbackCache = new MemoryCache();

/**
 * Fallback rate limiter using in-memory cache
 *
 * @param identifier - IP address or user ID
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function fallbackRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 10 * 1000 // 10 seconds default
): boolean {
  const now = Date.now();
  const entry = fallbackCache.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window - allow request
    fallbackCache.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return false;
  }

  // Increment count and allow
  entry.count++;
  fallbackCache.set(identifier, entry);
  return true;
}

/**
 * Extract IP address from request headers
 * Handles proxy chains and returns first valid IP
 */
export function extractIP(headers: Headers): string {
  console.log('extractIP: checking headers for IP address...');

  // Try x-forwarded-for first (proxy chain)
  const forwardedFor = headers.get('x-forwarded-for');
  console.log('extractIP: x-forwarded-for =', forwardedFor);
  if (forwardedFor) {
    // Take first IP in chain (client IP)
    const firstIP = forwardedFor.split(',')[0]?.trim();
    if (firstIP) {
      // Check if this is a localhost/development IP
      if (firstIP === '::1' || firstIP === '127.0.0.1' || firstIP === 'localhost') {
        console.log('extractIP: detected localhost IP, using development mode');
        if (process.env.NODE_ENV === 'development') {
          console.log('extractIP: development mode - using test IP for geolocation');
          return '8.8.8.8'; // Use test IP for geolocation in development
        }
      }
      console.log('extractIP: using x-forwarded-for IP =', firstIP);
      return firstIP;
    }
  }

  // Try x-real-ip (single proxy)
  const realIP = headers.get('x-real-ip');
  console.log('extractIP: x-real-ip =', realIP);
  if (realIP) {
    console.log('extractIP: using x-real-ip =', realIP);
    return realIP.trim();
  }

  // Try cf-connecting-ip (Cloudflare)
  const cfIP = headers.get('cf-connecting-ip');
  console.log('extractIP: cf-connecting-ip =', cfIP);
  if (cfIP) {
    console.log('extractIP: using cf-connecting-ip =', cfIP);
    return cfIP.trim();
  }

  // In development, try to get a public IP for testing
  // This helps with geolocation testing in localhost
  if (process.env.NODE_ENV === 'development') {
    console.log('extractIP: development mode - using test IP for geolocation');
    // Use a test IP that will return location data for development
    return '8.8.8.8'; // Google DNS - will return Mountain View, CA
  }

  // Fallback to anonymous
  console.log('extractIP: no IP headers found, using anonymous');
  return 'anonymous';
}
