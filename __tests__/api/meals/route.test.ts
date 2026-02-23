import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/meals/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    getMeals: vi.fn(),
    createMeal: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 403 })
  ),
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

vi.mock('@/lib/validations/meal-schemas', () => ({
  createMealSchema: {
    parse: vi.fn(),
  },
}));

describe('/api/meals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/meals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
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

      const request = new NextRequest('http://localhost/api/meals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user lacks meal planning feature access', async () => {
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

      const request = new NextRequest('http://localhost/api/meals?space_id=space-123', {
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

      const request = new NextRequest('http://localhost/api/meals', {
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

      const request = new NextRequest('http://localhost/api/meals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return meals successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { mealsService } = await import('@/lib/services/meals-service');

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

      const mockMeals = [
        { id: 'meal-1', name: 'Pasta', meal_type: 'dinner' },
        { id: 'meal-2', name: 'Oatmeal', meal_type: 'breakfast' },
      ];

      vi.mocked(mealsService.getMeals).mockResolvedValue(mockMeals as any);

      const request = new NextRequest('http://localhost/api/meals?space_id=space-123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMeals);
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

      const request = new NextRequest('http://localhost/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          name: 'Pasta',
          meal_type: 'dinner',
          scheduled_date: '2026-02-22',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user lacks meal planning feature access', async () => {
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

      const request = new NextRequest('http://localhost/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          meal_type: 'dinner',
          scheduled_date: '2026-02-22',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { createMealSchema } = await import('@/lib/validations/meal-schemas');

      const { z } = await import('zod');

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

      vi.mocked(createMealSchema.parse).mockImplementation(() => {
        throw new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['meal_type'],
            message: 'Required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          // Missing meal_type and scheduled_date
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { createMealSchema } = await import('@/lib/validations/meal-schemas');

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

      vi.mocked(createMealSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          meal_type: 'dinner',
          scheduled_date: '2026-02-22',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should create meal successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { createMealSchema } = await import('@/lib/validations/meal-schemas');

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

      vi.mocked(createMealSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockMeal = {
        id: '00000000-0000-4000-8000-000000000010',
        name: 'Pasta',
        meal_type: 'dinner',
        scheduled_date: '2026-02-22',
        space_id: '00000000-0000-4000-8000-000000000002',
      };

      vi.mocked(mealsService.createMeal).mockResolvedValue(mockMeal as any);

      const request = new NextRequest('http://localhost/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          space_id: '00000000-0000-4000-8000-000000000002',
          name: 'Pasta',
          meal_type: 'dinner',
          scheduled_date: '2026-02-22',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
    });
  });
});
