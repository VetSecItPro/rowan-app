import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  invalidateCache: vi.fn(),
  ADMIN_CACHE_KEYS: {
    adminGoals: 'admin:goals',
  },
  ADMIN_CACHE_TTL: {
    adminGoals: 300,
  },
}));

vi.mock('@/lib/services/admin-goals-service', () => ({
  adminGoalsService: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockGoal = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  metric_name: 'Active Users',
  target_value: 1000,
  current_value: 250,
  unit: 'users',
  deadline: null,
  status: 'active',
  notes: null,
  created_by: ADMIN_ID,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
  vi.mocked(verifyAdminAuth).mockResolvedValue(
    valid
      ? { isValid: true, adminId: ADMIN_ID }
      : { isValid: false, error: 'Admin authentication required' }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET ─────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/goals/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/goals');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { GET } = await import('@/app/api/admin/goals/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/goals');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('returns 200 with goals for authenticated admin', async () => {
      const { GET } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.getGoals).mockResolvedValue([mockGoal]);

      const req = new NextRequest('http://localhost/api/admin/goals');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.goals).toHaveLength(1);
      expect(data.goals[0].metric_name).toBe('Active Users');
    });

    it('bypasses cache when refresh=true is passed', async () => {
      const { GET } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.getGoals).mockResolvedValue([mockGoal]);
      const { withCache } = await import('@/lib/services/admin-cache-service');

      const req = new NextRequest('http://localhost/api/admin/goals?refresh=true');
      await GET(req);

      // withCache should have been called with skipCache: true
      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });

    it('returns 500 when getGoals throws', async () => {
      const { GET } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.getGoals).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/goals');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to fetch goals');
    });
  });

  // ── POST ────────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { POST } = await import('@/app/api/admin/goals/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { POST } = await import('@/app/api/admin/goals/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid body', async () => {
      const { POST } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({ metric_name: '', target_value: -5 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('returns 201 when goal is created successfully', async () => {
      const { POST } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.createGoal).mockResolvedValue(mockGoal);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({
          metric_name: 'Active Users',
          target_value: 1000,
          current_value: 250,
          unit: 'users',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.goal.metric_name).toBe('Active Users');
    });

    it('returns 500 when createGoal throws', async () => {
      const { POST } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.createGoal).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({
          metric_name: 'Active Users',
          target_value: 1000,
          unit: 'users',
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to create goal');
    });
  });

  // ── PUT ─────────────────────────────────────────────────────────────────────

  describe('PUT', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { PUT } = await import('@/app/api/admin/goals/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const res = await PUT(req);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { PUT } = await import('@/app/api/admin/goals/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'PUT',
        body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      });
      const res = await PUT(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when id is missing or invalid UUID', async () => {
      const { PUT } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'PUT',
        body: JSON.stringify({ id: 'not-a-uuid' }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('returns 200 when goal is updated successfully', async () => {
      const { PUT } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      const updatedGoal = { ...mockGoal, current_value: 500 };
      vi.mocked(adminGoalsService.updateGoal).mockResolvedValue(updatedGoal);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'PUT',
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440002',
          current_value: 500,
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.goal.current_value).toBe(500);
    });

    it('returns 500 when updateGoal throws', async () => {
      const { PUT } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.updateGoal).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'PUT',
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440002',
          current_value: 500,
        }),
      });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to update goal');
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { DELETE } = await import('@/app/api/admin/goals/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'DELETE',
        body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      });
      const res = await DELETE(req);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { DELETE } = await import('@/app/api/admin/goals/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'DELETE',
        body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      });
      const res = await DELETE(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid id in body', async () => {
      const { DELETE } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'not-a-uuid' }),
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('returns 200 when goal is deleted successfully', async () => {
      const { DELETE } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.deleteGoal).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'DELETE',
        body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 when deleteGoal throws', async () => {
      const { DELETE } = await import('@/app/api/admin/goals/route');
      await setupAuth(true);
      const { adminGoalsService } = await import('@/lib/services/admin-goals-service');
      vi.mocked(adminGoalsService.deleteGoal).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/goals', {
        method: 'DELETE',
        body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to delete goal');
    });
  });
});
