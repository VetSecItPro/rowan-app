import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/year-in-review/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/year-in-review-service', () => ({
  yearInReviewService: { generateYearInReview: vi.fn() },
}));
vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeSupabase(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'unauth' },
      }),
    },
  };
}

const validSpaceId = '00000000-0000-0000-0000-000000000002';

const mockYearInReviewData = {
  overview: {
    tasksCompleted: 120,
    goalsAchieved: 5,
    mealsPlanned: 80,
    eventsAttended: 30,
  },
};

describe('/api/year-in-review', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest(
        `http://localhost/api/year-in-review?space_id=${validSpaceId}`
      ));
      expect(res.status).toBe(429);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await GET(new NextRequest(
        `http://localhost/api/year-in-review?space_id=${validSpaceId}`
      ));
      expect(res.status).toBe(401);
    });

    it('returns 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await GET(new NextRequest('http://localhost/api/year-in-review'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/space_id/i);
    });

    it('returns 403 when user does not have space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Not a member'));

      const res = await GET(new NextRequest(
        `http://localhost/api/year-in-review?space_id=${validSpaceId}`
      ));
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toMatch(/access/i);
    });

    it('returns 400 for an invalid year', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const res = await GET(new NextRequest(
        `http://localhost/api/year-in-review?space_id=${validSpaceId}&year=1990`
      ));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid year/i);
    });

    it('returns 200 with year-in-review data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { yearInReviewService } = await import('@/lib/services/year-in-review-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(yearInReviewService.generateYearInReview).mockResolvedValue(mockYearInReviewData as any);

      const res = await GET(new NextRequest(
        `http://localhost/api/year-in-review?space_id=${validSpaceId}&year=2025`
      ));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview.tasksCompleted).toBe(120);
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/year-in-review', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId, year: 2025 }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/year-in-review', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId, year: 2025 }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await POST(new NextRequest('http://localhost/api/year-in-review', {
        method: 'POST',
        body: JSON.stringify({ year: 2025 }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/space_id/i);
    });

    it('returns 403 when user does not have space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Forbidden'));

      const res = await POST(new NextRequest('http://localhost/api/year-in-review', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId, year: 2025 }),
      }));
      const data = await res.json();
      expect(res.status).toBe(403);
    });

    it('returns 200 with export data on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { yearInReviewService } = await import('@/lib/services/year-in-review-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(yearInReviewService.generateYearInReview).mockResolvedValue(mockYearInReviewData as any);

      const res = await POST(new NextRequest('http://localhost/api/year-in-review', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId, year: 2025, format: 'pdf' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/export/i);
    });
  });
});
