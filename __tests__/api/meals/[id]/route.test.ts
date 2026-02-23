import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/meals/[id]/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    getMealById: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
  },
}));
vi.mock('@/lib/services/authorization-service', () => ({
  verifyResourceAccess: vi.fn(),
}));
vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 402 })
  ),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const MEAL_ID = '550e8400-e29b-41d4-a716-446655440004';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

const mockMeal = {
  id: MEAL_ID,
  space_id: SPACE_ID,
  name: 'Chicken Stir Fry',
  meal_type: 'dinner',
  scheduled_date: '2026-02-25',
};

function makeMockSupabase(user?: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: user !== undefined ? user : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
  };
}

const routeParams = { params: Promise.resolve({ id: MEAL_ID }) };

describe('/api/meals/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 402 when subscription tier is insufficient', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: false, tier: 'free' } as never);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);

      expect(res.status).toBe(402);
    });

    it('returns 404 when meal is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 403 when user has no access to meal space', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('returns 200 with meal data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(MEAL_ID);
    });
  });

  describe('PATCH', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Meal' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);

      expect(res.status).toBe(429);
    });

    it('returns 400 when body fails Zod validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        // 'meal_type' must be one of the enum values
        body: JSON.stringify({ meal_type: 'INVALID_TYPE', unknown_field: 'extra' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 200 with updated meal on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(mealsService.updateMeal).mockResolvedValue({ ...mockMeal, name: 'Updated Meal' } as never);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Meal' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Meal');
    });
  });

  describe('DELETE', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(429);
    });

    it('returns 404 when meal is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 200 on successful deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(mealsService.deleteMeal).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');
    });

    it('returns 403 when user has no access to meal', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as never);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
    });
  });
});
