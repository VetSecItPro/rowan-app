import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/goals/[id]/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoalById: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
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
vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((t: string) => t),
  sanitizeUrl: vi.fn((u: string) => u),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const GOAL_ID = '550e8400-e29b-41d4-a716-446655440003';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

const mockGoal = {
  id: GOAL_ID,
  space_id: SPACE_ID,
  title: 'Save $5000',
  description: 'Emergency fund goal',
  status: 'active',
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

const routeParams = { params: Promise.resolve({ id: GOAL_ID }) };

describe('/api/goals/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
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

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
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

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
      const res = await GET(req, routeParams);

      expect(res.status).toBe(402);
    });

    it('returns 404 when goal is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 403 when user has no access to goal space', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(mockGoal as never);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('returns 200 with goal data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(mockGoal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(GOAL_ID);
    });

    it('returns 500 on unexpected error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`);
      const res = await GET(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated goal' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);

      expect(res.status).toBe(401);
    });

    it('returns 404 when goal is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 200 with updated goal on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(mockGoal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(goalsService.updateGoal).mockResolvedValue({ ...mockGoal, title: 'Updated goal' } as never);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated goal' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated goal');
    });
  });

  describe('DELETE', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(429);
    });

    it('returns 404 when goal is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 200 on successful deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(mockGoal as never);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(goalsService.deleteGoal).mockResolvedValue(undefined);

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');
    });

    it('returns 403 when user has no access to goal', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { goalsService } = await import('@/lib/services/goals-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);
      vi.mocked(goalsService.getGoalById).mockResolvedValue(mockGoal as never);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/goals/${GOAL_ID}`, { method: 'DELETE' });
      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
    });
  });
});
