import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/database-growth/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
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

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

async function setupAuth(valid: boolean) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);

  if (!valid) {
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    return;
  }

  vi.mocked(safeCookiesAsync).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({
    adminId: 'admin-1',
    expiresAt: Date.now() + 86400000,
  });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

describe('/api/admin/database-growth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is missing', async () => {
      await setupAuth(false);

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session data is invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-payload' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-1', expiresAt: 0 });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad-token' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 200 with table data on success', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // The route queries multiple tables in parallel using Promise.allSettled
      // Each table query calls .from(name).select('*', { count, head }).then(...)
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        const countMap: Record<string, number> = {
          users: 100,
          spaces: 50,
          space_members: 200,
          tasks: 1500,
          launch_notifications: 300,
          feature_events: 5000,
          subscriptions: 80,
          subscription_events: 120,
          admin_logins: 15,
        };

        const count = countMap[table] ?? 0;

        // Simulate the .select().then() chain used in the route
        const mockResult = { count, error: null };
        const thenChain = {
          then: (resolve: (v: unknown) => unknown) => resolve(mockResult),
        };
        const selectChain = {
          select: vi.fn().mockReturnValue(thenChain),
        };
        return selectChain as any;
      });

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tables).toBeDefined();
      expect(Array.isArray(data.tables)).toBe(true);
      expect(data.totalSize).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('tables are sorted by row count descending', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        const countMap: Record<string, number> = {
          users: 10,
          spaces: 5,
          space_members: 20,
          tasks: 100,
          launch_notifications: 50,
          feature_events: 500,
          subscriptions: 8,
          subscription_events: 15,
          admin_logins: 3,
        };
        const count = countMap[table] ?? 0;
        const mockResult = { count, error: null };
        return {
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => unknown) => resolve(mockResult),
          }),
        } as any;
      });

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.tables.length > 1) {
        for (let i = 0; i < data.tables.length - 1; i++) {
          expect(data.tables[i].rowCount).toBeGreaterThanOrEqual(data.tables[i + 1].rowCount);
        }
      }
    });

    it('returns tables with schema field set to public', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => unknown) => resolve({ count: 5, error: null }),
          }),
        } as any;
      });

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.tables.forEach((t: { schema: string }) => {
        expect(t.schema).toBe('public');
      });
    });

    it('excludes tables with errors from results', async () => {
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        // users table returns an error, others succeed
        const hasError = table === 'users';
        return {
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => unknown) =>
              resolve({ count: hasError ? 0 : 10, error: hasError ? { message: 'Access denied' } : null }),
          }),
        } as any;
      });

      const request = new NextRequest('http://localhost/api/admin/database-growth', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const tableNames = data.tables.map((t: { tableName: string }) => t.tableName);
      expect(tableNames).not.toContain('users');
    });
  });
});
