import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/dashboard/stats/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: vi.fn(),
      },
    },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    dashboardStats: 'dashboard:stats',
  },
  ADMIN_CACHE_TTL: {
    dashboardStats: 60000,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('/api/admin/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard/stats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin auth fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: false,
        error: 'Admin authentication required',
      });

      const request = new NextRequest('http://localhost/api/admin/dashboard/stats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with dashboard stats for authenticated admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({ isValid: true, adminId: 'admin-1' });

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: {
          users: [
            { id: 'user-1', last_sign_in_at: new Date().toISOString() },
            { id: 'user-2', last_sign_in_at: new Date(Date.now() - 31 * 86400000).toISOString() },
          ],
          total: 2,
          nextPage: null,
          lastPage: 1,
          aud: '',
        },
        error: null,
      } as any);

      const mockCountResult = { count: 5, error: null };
      const mockCountQuery = vi.fn().mockResolvedValue(mockCountResult);
      const mockLt = vi.fn().mockReturnValue({ then: mockCountQuery });
      const mockGte = vi.fn().mockReturnValue({ lt: mockLt, then: mockCountQuery });
      const mockEq = vi.fn().mockReturnValue({ then: mockCountQuery });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, gte: mockGte });

      // Use Promise.allSettled format
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/admin/dashboard/stats', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalUsers).toBeDefined();
      expect(data.stats.activeUsers).toBeDefined();
    });
  });
});
