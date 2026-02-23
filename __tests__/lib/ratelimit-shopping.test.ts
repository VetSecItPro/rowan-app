/**
 * Unit tests for lib/ratelimit-shopping.ts
 *
 * Tests:
 * - checkShoppingTokenRateLimit: Redis success path, Redis failure fallback, rate-limit enforcement
 * - generateSecureShareToken: correct format, uniqueness, URL-safe base64
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock fns so they are available inside vi.mock factory
// ---------------------------------------------------------------------------
const { mockRatelimitLimit, mockLRUGet, mockLRUSet } = vi.hoisted(() => ({
  mockRatelimitLimit: vi.fn(),
  mockLRUGet: vi.fn(),
  mockLRUSet: vi.fn(),
}));

// Set env vars before module load so Redis.fromEnv() does not throw
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({}));
    limit = mockRatelimitLimit;
  },
}));

vi.mock('lru-cache', () => ({
  LRUCache: class {
    get = mockLRUGet;
    set = mockLRUSet;
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  checkShoppingTokenRateLimit,
  generateSecureShareToken,
} from '@/lib/ratelimit-shopping';

// ---------------------------------------------------------------------------
// checkShoppingTokenRateLimit — Redis success path
// ---------------------------------------------------------------------------
describe('checkShoppingTokenRateLimit — Redis success', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the Redis result when Redis succeeds (allowed)', async () => {
    mockRatelimitLimit.mockResolvedValueOnce({ success: true, limit: 5, remaining: 4 });
    const result = await checkShoppingTokenRateLimit('1.2.3.4');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('returns the Redis result when rate limited', async () => {
    mockRatelimitLimit.mockResolvedValueOnce({ success: false, limit: 5, remaining: 0 });
    const result = await checkShoppingTokenRateLimit('1.2.3.4');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkShoppingTokenRateLimit — fallback path (Redis throws)
// ---------------------------------------------------------------------------
describe('checkShoppingTokenRateLimit — fallback (Redis unavailable)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to in-memory cache when Redis throws', async () => {
    mockRatelimitLimit.mockRejectedValueOnce(new Error('Redis down'));
    mockLRUGet.mockReturnValueOnce(0); // 0 previous attempts

    const result = await checkShoppingTokenRateLimit('1.2.3.4');
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
  });

  it('allows first attempt in fallback (no prior entry)', async () => {
    mockRatelimitLimit.mockRejectedValueOnce(new Error('Redis down'));
    mockLRUGet.mockReturnValueOnce(undefined); // no entry

    const result = await checkShoppingTokenRateLimit('2.3.4.5');
    expect(result.success).toBe(true);
  });

  it('blocks when fallback count reaches limit (5)', async () => {
    mockRatelimitLimit.mockRejectedValueOnce(new Error('Redis down'));
    mockLRUGet.mockReturnValueOnce(5); // already at limit

    const result = await checkShoppingTokenRateLimit('3.4.5.6');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(5);
  });

  it('increments the fallback counter on each allowed request', async () => {
    mockRatelimitLimit.mockRejectedValueOnce(new Error('Redis down'));
    mockLRUGet.mockReturnValueOnce(2); // 2 previous attempts

    const result = await checkShoppingTokenRateLimit('4.5.6.7');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(5 - 2 - 1); // 2
    expect(mockLRUSet).toHaveBeenCalledWith('shopping_token_4.5.6.7', 3);
  });

  it('fallback returns a reset Date when blocked', async () => {
    mockRatelimitLimit.mockRejectedValueOnce(new Error('Redis down'));
    mockLRUGet.mockReturnValueOnce(5); // at limit

    const result = await checkShoppingTokenRateLimit('5.6.7.8');
    expect(result.reset).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// generateSecureShareToken
// ---------------------------------------------------------------------------
describe('generateSecureShareToken', () => {
  it('returns a non-empty string', () => {
    const token = generateSecureShareToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('generates tokens of consistent length (32 bytes → base64url ~43 chars)', () => {
    const token = generateSecureShareToken();
    // base64url of 32 bytes = ceil(32 * 4/3) with padding stripped ≈ 43 chars
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('generates URL-safe base64 (no +, /, or = characters)', () => {
    const token = generateSecureShareToken();
    expect(token).not.toContain('+');
    expect(token).not.toContain('/');
    expect(token).not.toContain('=');
  });

  it('generates unique tokens each call', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSecureShareToken()));
    expect(tokens.size).toBe(20);
  });

  it('contains only base64url-safe characters (A-Z, a-z, 0-9, -, _)', () => {
    const token = generateSecureShareToken();
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });
});
