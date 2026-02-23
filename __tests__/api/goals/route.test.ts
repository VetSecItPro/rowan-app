import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/goals/route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() => ({
    json: () => ({ error: 'Upgrade required' }),
    status: 403,
  })),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('/api/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
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

      const request = new NextRequest('http://localhost/api/goals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user lacks goals feature access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');

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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'free',
      });

      const request = new NextRequest('http://localhost/api/goals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');

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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/goals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return goals successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { goalsService } = await import('@/lib/services/goals-service');

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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockGoals = [
        { id: 'goal-1', title: 'Fitness Goal', progress: 50, target: 100 },
        { id: 'goal-2', title: 'Savings Goal', progress: 75, target: 100 },
      ];

      vi.mocked(goalsService.getGoals).mockResolvedValue(mockGoals as any);

      const request = new NextRequest('http://localhost/api/goals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockGoals);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
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

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          title: 'New Goal',
          description: 'Goal description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user lacks goals feature access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: false,
        tier: 'free',
      });

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          title: 'New Goal',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
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

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: 'space-123',
          // Missing required field: title
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should create goal successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { goalsService } = await import('@/lib/services/goals-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockGoal = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'New Goal',
        description: 'Goal description',
        space_id: '00000000-0000-4000-8000-000000000002',
        created_by: '00000000-0000-4000-8000-000000000001',
      };

      vi.mocked(goalsService.createGoal).mockResolvedValue(mockGoal as any);

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'New Goal',
          description: 'Goal description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
    });

    it('should sanitize input text', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { sanitizePlainText } = await import('@/lib/sanitize');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({
        allowed: true,
        tier: 'pro',
      });

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(goalsService.createGoal).mockResolvedValue({ id: '00000000-0000-4000-8000-000000000010' } as any);

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          title: 'New Goal',
          description: 'Description',
        }),
      });

      await POST(request);

      expect(sanitizePlainText).toHaveBeenCalledWith('New Goal');
      expect(sanitizePlainText).toHaveBeenCalledWith('Description');
    });
  });
});
