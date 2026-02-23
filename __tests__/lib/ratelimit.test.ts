/**
 * Unit tests for lib/ratelimit.ts
 *
 * Tests:
 * - checkRateLimit: Redis path, Redis failure → fallback path, fallback blocked
 * - checkGeneralRateLimit / checkApiRateLimit / checkAuthRateLimit etc. delegates
 * - checkAIChatRateLimit: selects correct limiter for 'family' vs other tiers
 * - All exported limiters are null when no Redis env vars are set (graceful degradation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock fns
// ---------------------------------------------------------------------------
const { mockRedisLimiterLimit, mockFallbackRateLimit } = vi.hoisted(() => ({
  mockRedisLimiterLimit: vi.fn(),
  mockFallbackRateLimit: vi.fn(),
}));

// No Redis env vars → all limiters will be null (graceful degradation)
// (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set in test env)

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({}));
    limit = mockRedisLimiterLimit;
  },
}));

vi.mock('./ratelimit-fallback', () => ({
  fallbackRateLimit: mockFallbackRateLimit,
}));

// Use the real fallback module path
vi.mock('@/lib/ratelimit-fallback', () => ({
  fallbackRateLimit: mockFallbackRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  ratelimit,
  apiRateLimit,
  authRateLimit,
  mfaRateLimit,
  expensiveOperationRateLimit,
  sensitiveOperationRateLimit,
  aiChatRateLimitPro,
  aiChatRateLimitFamily,
  aiBriefingRateLimit,
  aiSuggestionsRateLimit,
  checkRateLimit,
  checkGeneralRateLimit,
  checkApiRateLimit,
  checkAuthRateLimit,
  checkMfaRateLimit,
  checkExpensiveOperationRateLimit,
  checkSensitiveOperationRateLimit,
  checkAIChatRateLimit,
  checkAIBriefingRateLimit,
  checkAISuggestionsRateLimit,
} from '@/lib/ratelimit';

// ---------------------------------------------------------------------------
// Exported limiters are null when Redis is unavailable
// ---------------------------------------------------------------------------
describe('Rate limiter instances — no Redis env vars', () => {
  it('ratelimit is null (no Redis)', () => {
    expect(ratelimit).toBeNull();
  });

  it('apiRateLimit is null', () => {
    expect(apiRateLimit).toBeNull();
  });

  it('authRateLimit is null', () => {
    expect(authRateLimit).toBeNull();
  });

  it('mfaRateLimit is null', () => {
    expect(mfaRateLimit).toBeNull();
  });

  it('expensiveOperationRateLimit is null', () => {
    expect(expensiveOperationRateLimit).toBeNull();
  });

  it('sensitiveOperationRateLimit is null', () => {
    expect(sensitiveOperationRateLimit).toBeNull();
  });

  it('aiChatRateLimitPro is null', () => {
    expect(aiChatRateLimitPro).toBeNull();
  });

  it('aiChatRateLimitFamily is null', () => {
    expect(aiChatRateLimitFamily).toBeNull();
  });

  it('aiBriefingRateLimit is null', () => {
    expect(aiBriefingRateLimit).toBeNull();
  });

  it('aiSuggestionsRateLimit is null', () => {
    expect(aiSuggestionsRateLimit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit — fallback path (limiter is null)
// ---------------------------------------------------------------------------
describe('checkRateLimit — fallback path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success: true from fallback when allowed', async () => {
    mockFallbackRateLimit.mockReturnValueOnce(true);
    const result = await checkRateLimit('1.2.3.4', null, 10, 10000);
    expect(result).toEqual({ success: true });
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('1.2.3.4', 10, 10000);
  });

  it('returns success: false from fallback when blocked', async () => {
    mockFallbackRateLimit.mockReturnValueOnce(false);
    const result = await checkRateLimit('1.2.3.4', null, 10, 10000);
    expect(result).toEqual({ success: false });
  });

  it('uses default limit and window when not specified', async () => {
    mockFallbackRateLimit.mockReturnValueOnce(true);
    await checkRateLimit('1.2.3.4', null);
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('1.2.3.4', 10, 10000);
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit — Redis path then fallback on Redis failure
// ---------------------------------------------------------------------------
describe('checkRateLimit — Redis limiter provided but fails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to in-memory when Redis limiter throws', async () => {
    mockRedisLimiterLimit.mockRejectedValueOnce(new Error('Redis error'));
    mockFallbackRateLimit.mockReturnValueOnce(true);

    // Simulate a non-null limiter by passing a mock object
    const fakeLimiter = { limit: mockRedisLimiterLimit } as never;
    const result = await checkRateLimit('ip', fakeLimiter, 10, 10000);
    expect(result).toEqual({ success: true });
    expect(mockFallbackRateLimit).toHaveBeenCalled();
  });

  it('returns Redis result directly when Redis succeeds', async () => {
    mockRedisLimiterLimit.mockResolvedValueOnce({ success: true, remaining: 9 });

    const fakeLimiter = { limit: mockRedisLimiterLimit } as never;
    const result = await checkRateLimit('ip', fakeLimiter, 10, 10000);
    expect(result.success).toBe(true);
    expect(mockFallbackRateLimit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helper delegates — all use fallback since limiters are null
// ---------------------------------------------------------------------------
describe('Rate limit helper delegates', () => {
  beforeEach(() => {
    mockFallbackRateLimit.mockReturnValue(true);
    vi.clearAllMocks();
    mockFallbackRateLimit.mockReturnValue(true);
  });

  it('checkGeneralRateLimit returns success', async () => {
    const result = await checkGeneralRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });

  it('checkApiRateLimit returns success', async () => {
    const result = await checkApiRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });

  it('checkAuthRateLimit returns success', async () => {
    const result = await checkAuthRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });

  it('checkMfaRateLimit returns success', async () => {
    const result = await checkMfaRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });

  it('checkExpensiveOperationRateLimit returns success', async () => {
    const result = await checkExpensiveOperationRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });

  it('checkSensitiveOperationRateLimit returns success', async () => {
    const result = await checkSensitiveOperationRateLimit('1.2.3.4');
    expect(result).toHaveProperty('success');
  });
});

// ---------------------------------------------------------------------------
// checkAIChatRateLimit — tier-based limiter selection
// ---------------------------------------------------------------------------
describe('checkAIChatRateLimit', () => {
  beforeEach(() => {
    mockFallbackRateLimit.mockReturnValue(true);
    vi.clearAllMocks();
    mockFallbackRateLimit.mockReturnValue(true);
  });

  it('uses family limits (30/min window) when tier is "family"', async () => {
    const result = await checkAIChatRateLimit('user-1', 'family');
    expect(result).toHaveProperty('success');
    // fallback should be called with 30 (family limit)
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('user-1', 30, 60000);
  });

  it('uses pro limits (20/min window) for non-family tiers', async () => {
    const result = await checkAIChatRateLimit('user-1', 'pro');
    expect(result).toHaveProperty('success');
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('user-1', 20, 60000);
  });

  it('uses pro limits for free tier', async () => {
    await checkAIChatRateLimit('user-1', 'free');
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('user-1', 20, 60000);
  });
});

// ---------------------------------------------------------------------------
// checkAIBriefingRateLimit / checkAISuggestionsRateLimit
// ---------------------------------------------------------------------------
describe('checkAIBriefingRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFallbackRateLimit.mockReturnValue(true);
  });

  it('returns success result', async () => {
    const result = await checkAIBriefingRateLimit('user-1');
    expect(result).toHaveProperty('success');
    // briefing = 1 per 1h (3600000ms)
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('user-1', 1, 3600000);
  });
});

describe('checkAISuggestionsRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFallbackRateLimit.mockReturnValue(true);
  });

  it('returns success result', async () => {
    const result = await checkAISuggestionsRateLimit('user-1');
    expect(result).toHaveProperty('success');
    // suggestions = 30 per 1h
    expect(mockFallbackRateLimit).toHaveBeenCalledWith('user-1', 30, 3600000);
  });
});
