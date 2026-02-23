import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/founding-members/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/founding-members', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/founding-members'));
      expect(res.status).toBe(429);
    });

    it('returns safe defaults when table does not exist (PGRST116)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any);

      const res = await GET(new NextRequest('http://localhost/api/founding-members'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.currentCount).toBe(0);
      expect(data.maxCount).toBe(1000);
      expect(data.isFull).toBe(false);
    });

    it('returns founding member stats on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({ data: { current_count: 250, max_count: 1000 }, error: null });
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any);

      const res = await GET(new NextRequest('http://localhost/api/founding-members'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.currentCount).toBe(250);
      expect(data.spotsRemaining).toBe(750);
      expect(data.isFull).toBe(false);
    });

    it('returns isFull: true when spots are exhausted', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      const chain = makeChainMock({ data: { current_count: 1000, max_count: 1000 }, error: null });
      vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any);

      const res = await GET(new NextRequest('http://localhost/api/founding-members'));
      const data = await res.json();
      expect(data.isFull).toBe(true);
      expect(data.spotsRemaining).toBe(0);
    });
  });
});
