import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/calendar-sync/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('@/lib/services/calendar', () => ({
  calendarSyncService: { performSync: vi.fn() },
}));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  vi.clearAllMocks();
});

describe('/api/cron/calendar-sync', () => {
  describe('GET', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const req = new Request('http://localhost/api/cron/calendar-sync');
      const res = await GET(req);
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new Request('http://localhost/api/cron/calendar-sync', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid provider', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      // Route builds query chain before provider validation, so we must mock from()
      const dummyChain = makeChainMock({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(dummyChain as any);

      const req = new Request('http://localhost/api/cron/calendar-sync?provider=badprovider', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 200 with no connections message when no connections due for sync', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const emptyChain = makeChainMock({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(emptyChain as any);

      const req = new Request('http://localhost/api/cron/calendar-sync', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/no connections/i);
    });

    it('returns 500 when DB query for connections fails', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const errorChain = makeChainMock({ data: null, error: { message: 'DB error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(errorChain as any);

      const req = new Request('http://localhost/api/cron/calendar-sync', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });
});
