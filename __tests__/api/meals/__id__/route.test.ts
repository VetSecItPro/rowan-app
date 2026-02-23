import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/meals/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

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
    new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 403 })
  ),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

const MEAL_ID = '00000000-0000-4000-8000-000000000010';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const mockMeal = {
  id: MEAL_ID,
  name: 'Pasta',
  meal_type: 'dinner',
  scheduled_date: '2026-02-22',
  space_id: '00000000-0000-4000-8000-000000000002',
};

function makeProps() {
  return { params: Promise.resolve({ id: MEAL_ID }) };
}

function mockAuthAndTier(
  createClient: ReturnType<typeof vi.fn>,
  canAccessFeature: ReturnType<typeof vi.fn>,
  userId = USER_ID
) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);

  vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' });
}

describe('/api/meals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when feature access denied', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: false, tier: 'free' });

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());

      expect(response.status).toBe(403);
    });

    it('should return 404 when meal not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meal not found');
    });

    it('should return 403 when user lacks resource access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Forbidden'));

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this meal');
    });

    it('should return meal successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'GET' });
      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(MEAL_ID);
    });
  });

  describe('PATCH', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Pasta' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when meal not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Pasta' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meal not found');
    });

    it('should return 400 for invalid update data', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        // Unknown key fails strict schema
        body: JSON.stringify({ unknown_field: 'value' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should update meal successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const updatedMeal = { ...mockMeal, name: 'Updated Pasta' };
      vi.mocked(mealsService.updateMeal).mockResolvedValue(updatedMeal as any);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Pasta' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Pasta');
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when meal not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meal not found');
    });

    it('should delete meal successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { mealsService } = await import('@/lib/services/meals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      mockAuthAndTier(createClient as any, canAccessFeature as any);
      vi.mocked(mealsService.getMealById).mockResolvedValue(mockMeal as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(mealsService.deleteMeal).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/meals/${MEAL_ID}`, { method: 'DELETE' });
      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Meal deleted successfully');
    });
  });
});
