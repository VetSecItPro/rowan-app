import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/subscriptions/check-upgrade/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  shouldPromptUpgrade: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('/api/subscriptions/check-upgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseAI' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseAI' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing feature name', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should return 400 for empty feature name', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should return upgrade not needed when user has access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { shouldPromptUpgrade } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(shouldPromptUpgrade).mockResolvedValue({
        shouldPrompt: false,
        currentTier: 'pro',
        requiredTier: 'pro',
        reason: 'User has access',
      });

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseAI' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shouldPrompt).toBe(false);
      expect(data.currentTier).toBe('pro');
    });

    it('should return upgrade needed when user lacks access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { shouldPromptUpgrade } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(shouldPromptUpgrade).mockResolvedValue({
        shouldPrompt: true,
        currentTier: 'free',
        requiredTier: 'pro',
        reason: 'Feature requires Pro tier',
      });

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseAI' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shouldPrompt).toBe(true);
      expect(data.currentTier).toBe('free');
      expect(data.requiredTier).toBe('pro');
      expect(data.reason).toBe('Feature requires Pro tier');
    });

    it('should handle different feature names', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { shouldPromptUpgrade } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(shouldPromptUpgrade).mockResolvedValue({
        shouldPrompt: false,
        currentTier: 'family',
        requiredTier: 'pro',
        reason: 'User has access',
      });

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseHousehold' }),
      });

      await POST(request);

      expect(shouldPromptUpgrade).toHaveBeenCalledWith('user-123', 'canUseHousehold');
    });

    it('should return 500 on service error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { shouldPromptUpgrade } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(shouldPromptUpgrade).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/subscriptions/check-upgrade', {
        method: 'POST',
        body: JSON.stringify({ feature: 'canUseAI' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to check upgrade requirement');
    });
  });
});
