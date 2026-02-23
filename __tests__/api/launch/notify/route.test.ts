import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/launch/notify/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single', 'insert', 'update'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.rpc = vi.fn(() => ({ then: vi.fn((r: (v: unknown) => unknown) => r({ error: null })) }));
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/launch/notify', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/launch/notify', {
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid email', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await POST(new NextRequest('http://localhost/api/launch/notify', {
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', email: 'not-an-email' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 409 when email is already subscribed', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({ data: { id: '1', subscribed: true }, error: null });
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any);

      const res = await POST(new NextRequest('http://localhost/api/launch/notify', {
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
      }));
      expect(res.status).toBe(409);
    });

    it('returns 200 with success message for new subscriber', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      // First call: no existing subscription (PGRST116)
      const noExistChain = makeChainMock({ data: null, error: { code: 'PGRST116' } });
      const insertChain = makeChainMock({ data: null, error: null });
      const rpcChain = { error: null };
      const countChain = { count: 42, error: null };

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => {
          callCount++;
          return callCount === 1 ? noExistChain : insertChain;
        }),
        rpc: vi.fn().mockResolvedValue(rpcChain),
      } as any);

      // Manually mock the second from call (count query)
      const supabaseMock = await (await import('@/lib/supabase/server')).createClient();
      let fromCallCount = 0;
      (supabaseMock as any).from = vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) return noExistChain;
        if (fromCallCount === 2) return insertChain;
        // count query
        const countMock: Record<string, unknown> = {};
        const h = () => countMock;
        ['select', 'eq'].forEach(m => { countMock[m] = vi.fn(h); });
        countMock.then = vi.fn((r: (v: unknown) => unknown) => r({ count: 42, error: null }));
        return countMock;
      });

      const res = await POST(new NextRequest('http://localhost/api/launch/notify', {
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
