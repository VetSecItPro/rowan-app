import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/users/route';

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
    usersList: vi.fn((page: number, limit: number) => `users:${page}:${limit}`),
  },
  ADMIN_CACHE_TTL: {
    usersList: 120000,
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('/api/admin/users', () => {
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

      const request = new NextRequest('http://localhost/api/admin/users', {
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

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 400 for invalid page query param', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({ isValid: true, adminId: 'admin-1' });

      const request = new NextRequest('http://localhost/api/admin/users?page=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 200 with paginated users on success', async () => {
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

      // Production now queries .from('profiles').select(...).order(...).range(...)
      const rangeMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            full_name: 'User One',
            avatar_url: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
        ],
        error: null,
        count: 1,
      });
      const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].email).toBe('user1@example.com');
      expect(data.pagination).toBeDefined();
    });
  });
});
