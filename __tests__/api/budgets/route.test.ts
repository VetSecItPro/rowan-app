import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/budgets/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getBudget: vi.fn(),
    setBudget: vi.fn(),
  },
}));
vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/utils/cache-headers', () => ({ withUserDataCache: vi.fn((r) => r) }));
vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text: string) => text),
  sanitizeUrl: vi.fn((url: string) => url),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

function makeMockSupabase(userOverride?: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userOverride !== undefined ? userOverride : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
  };
}

// Valid body that passes createBudgetSchema:
// start_date and end_date must be explicitly null to avoid a refine edge case
// when the fields are undefined (the transform doesn't map undefined -> null).
const validPostBody = {
  space_id: SPACE_ID,
  monthly_budget: 3000,
  start_date: null,
  end_date: null,
};

describe('/api/budgets', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/budgets?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);

      const req = new NextRequest(`http://localhost/api/budgets?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);

      const req = new NextRequest('http://localhost/api/budgets');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('space_id');
    });

    it('returns 403 when user has no access to space', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest(`http://localhost/api/budgets?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('returns 200 with budget data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsService.getBudget).mockResolvedValue({
        id: 'budget-1',
        space_id: SPACE_ID,
        monthly_budget: 3000,
      } as never);

      const req = new NextRequest(`http://localhost/api/budgets?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('returns 500 on unexpected error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest(`http://localhost/api/budgets?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify(validPostBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase(null) as never);

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify(validPostBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when body fails Zod validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'not-a-uuid', monthly_budget: -1 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Validation');
    });

    it('returns 403 when user has no access to space', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify(validPostBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('returns 200 with budget data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { projectsService } = await import('@/lib/services/budgets-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(projectsService.setBudget).mockResolvedValue({
        id: 'budget-1',
        space_id: SPACE_ID,
        monthly_budget: 3000,
      } as never);

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify(validPostBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('returns 500 on unexpected error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/budgets', {
        method: 'POST',
        body: JSON.stringify(validPostBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('budget');
    });
  });
});
