import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/ai-data-cleanup/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert'].forEach(m => {
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

describe('/api/cron/ai-data-cleanup', () => {
  describe('GET', () => {
    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/cron/ai-data-cleanup', {
        headers: { authorization: 'Bearer wrong' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 500 when DB query fails to find old conversations', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const errorChain = makeChainMock({ data: null, error: { message: 'DB error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(errorChain as any);

      const req = new NextRequest('http://localhost/api/cron/ai-data-cleanup', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it('returns 200 with zero deleted when no old conversations exist', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const emptyChain = makeChainMock({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(emptyChain as any);

      const req = new NextRequest('http://localhost/api/cron/ai-data-cleanup', {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted.conversations).toBe(0);
    });
  });
});
