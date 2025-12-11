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
 *
 * SECURITY: IP extraction priority for rate limiting:
 * 1. Vercel-specific headers (trusted, sanitized by Vercel)
 * 2. Cloudflare-specific header (trusted, set by Cloudflare)
 * 3. x-real-ip (typically set by reverse proxy)
 * 4. x-forwarded-for LAST IP (rightmost is most trusted - set by our proxy)
 *
 * NOTE: We do NOT trust the FIRST IP in x-forwarded-for because attackers
 * can prepend fake IPs. The rightmost IP is set by our trusted proxy.
 *
 * @param headers Request headers
 * @returns IP address for rate limiting (NOT for geolocation or logging)
 */
export function extractIP(headers: Headers): string {
  // SECURITY: In production, trust platform-specific headers first
  // These are sanitized by the platform and cannot be spoofed

  // 1. Vercel sets this header with the true client IP (cannot be spoofed)
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    const ip = vercelForwardedFor.split(',')[0]?.trim();
    if (ip && isValidIP(ip)) {
      return ip;
    }
  }

  // 2. Cloudflare sets this header (cannot be spoofed when behind CF)
  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP && isValidIP(cfIP.trim())) {
    return cfIP.trim();
  }

  // 3. x-real-ip is typically set by nginx/reverse proxy
  const realIP = headers.get('x-real-ip');
  if (realIP && isValidIP(realIP.trim())) {
    return realIP.trim();
  }

  // 4. x-forwarded-for - SECURITY: Use LAST IP, not first
  // The last IP is set by our trusted proxy; first can be spoofed
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Use the last IP in the chain (most trusted - set by our infra)
    const lastIP = ips[ips.length - 1];
    if (lastIP && isValidIP(lastIP)) {
      return lastIP;
    }
  }

  // 5. In development, use a stable identifier per session
  // SECURITY: Do NOT use a constant IP that all dev instances share
  if (process.env.NODE_ENV === 'development') {
    // Use 'dev-localhost' as identifier - unique per environment
    return 'dev-localhost';
  }

  // Fallback to anonymous (will share rate limit bucket)
  return 'anonymous';
}

/**
 * Validate IP address format (basic check)
 * Prevents injection attacks via malformed IPs
 */
function isValidIP(ip: string): boolean {
  if (!ip || ip.length > 45) return false; // IPv6 max length
  // Basic IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Basic IPv6 pattern (simplified)
  const ipv6Pattern = /^[a-fA-F0-9:]+$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}
