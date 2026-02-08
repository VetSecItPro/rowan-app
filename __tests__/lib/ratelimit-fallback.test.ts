/**
 * Unit tests for lib/ratelimit-fallback.ts
 *
 * Tests:
 * - extractIP: header priority chain, spoofing defense, IP validation
 * - fallbackRateLimit: window enforcement, counting, expiry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractIP, fallbackRateLimit } from '@/lib/ratelimit-fallback';

describe('extractIP', () => {
  function makeHeaders(entries: Record<string, string>): Headers {
    return new Headers(entries);
  }

  it('should prefer x-vercel-forwarded-for (highest priority)', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '1.2.3.4',
      'cf-connecting-ip': '5.6.7.8',
      'x-real-ip': '9.10.11.12',
      'x-forwarded-for': '13.14.15.16',
    });
    expect(extractIP(headers)).toBe('1.2.3.4');
  });

  it('should use cf-connecting-ip when vercel header is absent', () => {
    const headers = makeHeaders({
      'cf-connecting-ip': '5.6.7.8',
      'x-real-ip': '9.10.11.12',
    });
    expect(extractIP(headers)).toBe('5.6.7.8');
  });

  it('should use x-real-ip when vercel and cf headers are absent', () => {
    const headers = makeHeaders({
      'x-real-ip': '9.10.11.12',
      'x-forwarded-for': '13.14.15.16, 17.18.19.20',
    });
    expect(extractIP(headers)).toBe('9.10.11.12');
  });

  it('should use LAST IP from x-forwarded-for (anti-spoofing)', () => {
    const headers = makeHeaders({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3',
    });
    // Last IP is most trusted (set by our proxy)
    expect(extractIP(headers)).toBe('3.3.3.3');
  });

  it('should handle single IP in x-forwarded-for', () => {
    const headers = makeHeaders({
      'x-forwarded-for': '10.0.0.1',
    });
    expect(extractIP(headers)).toBe('10.0.0.1');
  });

  it('should use first IP from x-vercel-forwarded-for (comma-separated)', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(extractIP(headers)).toBe('1.2.3.4');
  });

  it('should skip invalid IPs and fall through', () => {
    const headers = makeHeaders({
      'x-vercel-forwarded-for': 'not-an-ip',
      'cf-connecting-ip': 'also-bad',
      'x-real-ip': '192.168.1.1',
    });
    expect(extractIP(headers)).toBe('192.168.1.1');
  });

  it('should reject IPs longer than 45 characters', () => {
    const longIP = 'a'.repeat(46);
    const headers = makeHeaders({
      'x-real-ip': longIP,
    });
    // Should not return the long IP, should fall through
    expect(extractIP(headers)).not.toBe(longIP);
  });

  it('should accept valid IPv6 addresses', () => {
    const headers = makeHeaders({
      'x-real-ip': '2001:db8::1',
    });
    expect(extractIP(headers)).toBe('2001:db8::1');
  });

  it('should return dev-localhost in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const headers = makeHeaders({});
    expect(extractIP(headers)).toBe('dev-localhost');
    vi.unstubAllEnvs();
  });

  it('should return anonymous when no headers and not in dev', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const headers = makeHeaders({});
    expect(extractIP(headers)).toBe('anonymous');
    vi.unstubAllEnvs();
  });
});

describe('fallbackRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request', () => {
    expect(fallbackRateLimit('test-ip-1', 5, 10000)).toBe(true);
  });

  it('should allow requests up to the limit', () => {
    const id = 'test-ip-limit';
    for (let i = 0; i < 5; i++) {
      expect(fallbackRateLimit(id, 5, 10000)).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const id = 'test-ip-exceed';
    for (let i = 0; i < 5; i++) {
      fallbackRateLimit(id, 5, 10000);
    }
    expect(fallbackRateLimit(id, 5, 10000)).toBe(false);
  });

  it('should reset after the time window expires', () => {
    const id = 'test-ip-reset';
    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      fallbackRateLimit(id, 5, 10000);
    }
    expect(fallbackRateLimit(id, 5, 10000)).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11000);

    // Should be allowed again
    expect(fallbackRateLimit(id, 5, 10000)).toBe(true);
  });

  it('should track different identifiers independently', () => {
    // Fill up one IP's limit
    for (let i = 0; i < 3; i++) {
      fallbackRateLimit('ip-a', 3, 10000);
    }
    expect(fallbackRateLimit('ip-a', 3, 10000)).toBe(false);

    // Different IP should still be allowed
    expect(fallbackRateLimit('ip-b', 3, 10000)).toBe(true);
  });

  it('should use default values when not specified', () => {
    const id = 'test-default-' + Date.now();
    // Default is 10 requests per 10 seconds
    expect(fallbackRateLimit(id)).toBe(true);
  });
});
