import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chores/[choreId]/complete/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/services/rewards/late-penalty-service', () => ({
  applyLatePenalty: vi.fn(),
  calculatePenalty: vi.fn(() => ({ isLate: false, penaltyPoints: 0, daysLate: 0 })),
  getSpacePenaltySettings: vi.fn(() => Promise.resolve({ enabled: false })),
}));
vi.mock('@/lib/services/feature-access-service', () => ({
  canAccessFeature: vi.fn(),
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 402 })
  ),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const CHORE_ID = '550e8400-e29b-41d4-a716-446655440003';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockChore = {
  id: CHORE_ID,
  title: 'Clean bathroom',
  space_id: SPACE_ID,
  status: 'pending',
  due_date: null,
  point_value: 10,
  late_penalty_enabled: false,
  late_penalty_points: 0,
  grace_period_hours: 0,
};

function makeMockSupabase(options?: {
  user?: unknown;
  choreData?: unknown;
  choreError?: unknown;
  memberData?: unknown;
  memberError?: unknown;
}) {
  const choreChain = createChainMock({
    data: options?.choreData !== undefined ? options.choreData : mockChore,
    error: options?.choreError ?? null,
  });
  const memberChain = createChainMock({
    data: options?.memberData !== undefined ? options.memberData : { space_id: SPACE_ID },
    error: options?.memberError ?? null,
  });
  const updatedChoreChain = createChainMock({
    data: { ...mockChore, status: 'completed' },
    error: null,
  });
  const rpcChain = { data: { points_awarded: 10, streak_bonus: 0, new_streak: 1 }, error: null };

  let fromCallCount = 0;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.user !== undefined ? options.user : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'chores') {
        fromCallCount++;
        if (fromCallCount === 1) return choreChain;   // initial fetch
        return updatedChoreChain;                     // update
      }
      if (table === 'space_members') return memberChain;
      return createChainMock({ data: null, error: null });
    }),
    rpc: vi.fn().mockResolvedValue(rpcChain),
  };
}

const routeParams = { params: Promise.resolve({ choreId: CHORE_ID }) };

describe('/api/chores/[choreId]/complete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: null }) as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
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

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);

      expect(res.status).toBe(402);
    });

    it('returns 404 when chore is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(
        makeMockSupabase({ choreData: null, choreError: { message: 'Not found' } }) as never
      );
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(
        makeMockSupabase({ memberData: null, memberError: { message: 'Not found' } }) as never
      );
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('member');
    });

    it('returns 400 when chore is already completed', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(
        makeMockSupabase({ choreData: { ...mockChore, status: 'completed' } }) as never
      );
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('already completed');
    });

    it('returns 200 with rewards on successful completion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'family' } as never);

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rewards).toBeDefined();
      expect(data.penalty).toBeDefined();
      expect(typeof data.netPoints).toBe('number');
    });

    it('returns 500 on unexpected error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest(`http://localhost/api/chores/${CHORE_ID}/complete`, {
        method: 'POST',
      });
      const res = await POST(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });
});
