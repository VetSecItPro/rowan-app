import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/bulk/archive-old-data/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/bulk-operations-service', () => ({
  archiveOldExpenses: vi.fn(),
  archiveOldTasks: vi.fn(),
  archiveOldCalendarEvents: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({ checkExpensiveOperationRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

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

describe('/api/bulk/archive-old-data', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/bulk/archive-old-data', {
        method: 'POST',
        body: JSON.stringify({ space_id: '00000000-0000-4000-8000-000000000001', data_type: 'expenses', older_than_date: '2023-01-01' }),
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

      const res = await POST(new NextRequest('http://localhost/api/bulk/archive-old-data', {
        method: 'POST',
        body: JSON.stringify({ space_id: '00000000-0000-4000-8000-000000000001', data_type: 'expenses', older_than_date: '2023-01-01' }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid request body', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/bulk/archive-old-data', {
        method: 'POST',
        body: JSON.stringify({ data_type: 'expenses' }), // missing space_id and older_than_date
      }));
      expect(res.status).toBe(400);
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

      const res = await POST(new NextRequest('http://localhost/api/bulk/archive-old-data', {
        method: 'POST',
        body: JSON.stringify({ space_id: '00000000-0000-4000-8000-000000000001', data_type: 'expenses', older_than_date: '2023-01-01' }),
      }));
      expect(res.status).toBe(403);
    });

    it('returns 200 with archived count on success', async () => {
      const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { archiveOldExpenses } = await import('@/lib/services/bulk-operations-service');
      vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue(makeRateLimit(true));

      const memberChain = makeChainMock({ data: { space_id: 'space-1' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => memberChain),
      } as any);
      vi.mocked(archiveOldExpenses).mockResolvedValue({ success: true, archived_count: 7 } as any);

      const res = await POST(new NextRequest('http://localhost/api/bulk/archive-old-data', {
        method: 'POST',
        body: JSON.stringify({ space_id: '00000000-0000-4000-8000-000000000001', data_type: 'expenses', older_than_date: '2023-01-01' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.archived_count).toBe(7);
    });
  });
});
