import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cron/process-deletions/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn(), auth: { admin: { deleteUser: vi.fn() } } } }));
vi.mock('@/lib/security/verify-secret', () => ({ verifyCronSecret: vi.fn() }));
vi.mock('resend', () => ({ Resend: vi.fn(() => ({ emails: { send: vi.fn().mockResolvedValue({}) } })) }));
vi.mock('@/lib/utils/app-url', () => ({ getAppUrl: vi.fn(() => 'http://localhost:3000') }));

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.RESEND_API_KEY = 'test-key';
  vi.clearAllMocks();
});

describe('/api/cron/process-deletions', () => {
  describe('POST', () => {
    it('returns 500 when CRON_SECRET is not set', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/process-deletions', {
        method: 'POST', headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      process.env.CRON_SECRET = CRON_SECRET;
    });

    it('returns 401 when cron secret is invalid', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      vi.mocked(verifyCronSecret).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/cron/process-deletions', {
        method: 'POST', headers: { authorization: 'Bearer wrong' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with results when authorized and no accounts to process', async () => {
      const { verifyCronSecret } = await import('@/lib/security/verify-secret');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(verifyCronSecret).mockReturnValue(true);

      const emptyChain = makeChainMock({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(emptyChain as any);

      const req = new NextRequest('http://localhost/api/cron/process-deletions', {
        method: 'POST', headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results.sevenDayReminders).toBe(0);
      expect(data.results.deletionsProcessed).toBe(0);
    });
  });
});
