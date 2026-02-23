import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/bulk/delete-expenses/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/bulk-operations-service', () => ({
  bulkDeleteExpenses: vi.fn(),
  getExpensesBulkDeleteCount: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({ checkExpensiveOperationRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/security/csrf-validation', () => ({ validateCsrfRequest: vi.fn(() => null) }));

function makeRateLimit(success: boolean) {
  return { success, limit: 5, remaining: success ? 4 : 0, reset: Date.now() + 3600000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const validSpaceId = '00000000-0000-4000-8000-000000000001';

describe('/api/bulk/delete-expenses', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/bulk/delete-expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/bulk/delete-expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not a space member', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      const noMemberChain = makeChainMock({ data: null, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => noMemberChain),
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/bulk/delete-expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId }),
      }));
      expect(res.status).toBe(403);
    });

    it('returns 200 with deleted count on success', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { bulkDeleteExpenses } = await import('@/lib/services/bulk-operations-service');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      const memberChain = makeChainMock({ data: { space_id: validSpaceId, user_id: 'user-1', role: 'owner' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => memberChain),
      } as any);
      vi.mocked(bulkDeleteExpenses).mockResolvedValue({ success: true, deleted_count: 12 } as any);

      const res = await POST(new NextRequest('http://localhost/api/bulk/delete-expenses', {
        method: 'POST',
        body: JSON.stringify({ space_id: validSpaceId }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.deleted_count).toBe(12);
    });
  });

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest(`http://localhost/api/bulk/delete-expenses?space_id=${validSpaceId}`));
      expect(res.status).toBe(429);
    });

    it('returns 200 with count on success', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getExpensesBulkDeleteCount } = await import('@/lib/services/bulk-operations-service');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      const memberChain = makeChainMock({ data: { space_id: validSpaceId }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => memberChain),
      } as any);
      vi.mocked(getExpensesBulkDeleteCount).mockResolvedValue(5 as any);

      const res = await GET(new NextRequest(`http://localhost/api/bulk/delete-expenses?space_id=${validSpaceId}`));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.count).toBe(5);
    });
  });
});
