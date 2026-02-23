import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/audit-trail/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: {
      admin: {
        listUsers: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    auditTrail: vi.fn((page: number, filter: string) => `audit:trail:${page}:${filter}`),
  },
  ADMIN_CACHE_TTL: {
    auditTrail: 120,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

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

describe('/api/admin/audit-trail', () => {
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

      const request = new NextRequest('http://localhost/api/admin/audit-trail', {
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

      const request = new NextRequest('http://localhost/api/admin/audit-trail', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with merged audit trail entries', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      const mockAuditLogs = [
        {
          id: 'audit-1',
          admin_user_id: 'admin-1',
          action: 'user_banned',
          target_resource: 'user:abc123',
          metadata: null,
          ip_address: '127.0.0.1',
          created_at: '2024-02-01T12:00:00Z',
        },
      ];

      const mockSubEvents = [
        {
          id: 'sub-1',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          event_type: 'upgrade',
          from_tier: 'free',
          to_tier: 'pro',
          trigger_source: 'stripe',
          metadata: null,
          created_at: '2024-02-01T11:00:00Z',
        },
      ];

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'admin_audit_log') {
          return createChainMock({ data: mockAuditLogs, error: null }) as any;
        }
        if (table === 'subscription_events') {
          return createChainMock({ data: mockSubEvents, error: null }) as any;
        }
        return createChainMock({ data: [], error: null }) as any;
      });

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: {
          users: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              email: 'user@example.com',
              created_at: '2024-01-01T00:00:00Z',
              email_confirmed_at: '2024-01-01T00:00:00Z',
              app_metadata: { provider: 'email' },
            },
          ],
        },
        error: null,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/audit-trail', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.auditTrail).toBeDefined();
      expect(data.auditTrail.entries).toBeDefined();
      expect(data.auditTrail.total).toBeGreaterThanOrEqual(0);
      expect(data.auditTrail.page).toBe(1);
    });

    it('returns 200 with empty entries when no data', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [] },
        error: null,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/audit-trail', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.auditTrail.entries).toEqual([]);
      expect(data.auditTrail.total).toBe(0);
    });

    it('supports pagination query params', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: [], error: null }) as any
      );

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [] },
        error: null,
      } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/audit-trail?page=2&limit=25',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditTrail.page).toBe(2);
      expect(data.auditTrail.limit).toBe(25);
    });

    it('handles database errors gracefully and still returns result', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      // Simulate DB errors on both tables
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        createChainMock({ data: null, error: { message: 'DB error' } }) as any
      );

      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [] },
        error: null,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/audit-trail', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      // Should still succeed (DB errors are handled gracefully)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
