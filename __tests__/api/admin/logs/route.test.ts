import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/logs/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/utils/error-alerting', () => ({
  getErrorStats: vi.fn(() => ({ total: 0, byType: {} })),
}));

// Mock @supabase/supabase-js used internally by the logs route
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('/api/admin/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
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

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('returns 401 when no auth token is provided', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      // Route uses createClient internally for token verification
      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } }),
        },
        from: vi.fn(),
      } as any);

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'GET',
        // No Authorization header or cookie
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('No authentication token provided');
    });

    it('returns 401 when user is not in admin_users table', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const mockAdminSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockAdminIsActive = vi.fn().mockReturnValue({ single: mockAdminSingle });
      const mockAdminEq = vi.fn().mockReturnValue({ eq: mockAdminIsActive });
      const mockAdminSelect = vi.fn().mockReturnValue({ eq: mockAdminEq });
      const mockAdminFrom = vi.fn().mockReturnValue({ select: mockAdminSelect });

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'notadmin@example.com' } },
            error: null,
          }),
        },
        from: mockAdminFrom,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Access denied');
    });

    it('returns 200 with logs for authenticated admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const mockLogs = [
        {
          id: 'log-1',
          timestamp: '2024-01-01T00:00:00Z',
          level: 'info',
          event: 'subscription.created',
          user_id: 'user-abc',
          tier: 'plus',
          period: 'monthly',
        },
      ];

      const mockRange = vi.fn().mockResolvedValue({ data: mockLogs, error: null, count: 1 });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

      const mockSummaryLimit = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockSummarySelect = vi.fn().mockReturnValue({ limit: mockSummaryLimit });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'monetization_logs') return { select: mockSelect };
        if (table === 'monetization_error_summary') return { select: mockSummarySelect };
        if (table === 'admin_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { email: 'admin@example.com', role: 'admin', is_active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-admin', email: 'admin@example.com' } },
            error: null,
          }),
        },
        from: mockFrom,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-admin-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toBeDefined();
      expect(data.data.pagination).toBeDefined();
      expect(data.data.stats).toBeDefined();
    });

    it('returns 400 for invalid query parameters', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-admin', email: 'admin@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { email: 'admin@example.com', role: 'admin', is_active: true },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // userId must be a UUID — pass invalid one
      const request = new NextRequest('http://localhost/api/admin/logs?userId=not-a-uuid', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-admin-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } }),
        },
        from: vi.fn(),
      } as any);

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('returns JSON export for authenticated admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const supabaseJs = await import('@supabase/supabase-js');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const mockLogs = [
        { timestamp: '2024-01-01', level: 'info', event: 'test.event' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({ data: mockLogs, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'monetization_logs') return { select: mockSelect };
        if (table === 'admin_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { email: 'admin@example.com', role: 'admin', is_active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      vi.mocked(supabaseJs.createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-admin', email: 'admin@example.com' } },
            error: null,
          }),
        },
        from: mockFrom,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/logs', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });
});
