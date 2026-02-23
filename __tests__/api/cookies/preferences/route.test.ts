import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/cookies/preferences/route';

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
  ['select', 'eq', 'single', 'update', 'insert', 'order', 'limit'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

function makeSupabase(user: unknown, chainData: unknown = { data: null, error: null }) {
  const chain = makeChainMock(chainData);
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'unauth' } }) },
    from: vi.fn(() => chain),
  };
}

describe('/api/cookies/preferences', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await GET(new NextRequest('http://localhost/api/cookies/preferences'));
      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/cookies/preferences'));
      expect(res.status).toBe(429);
    });

    it('returns 200 with cookie preferences on success', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const privacyChain = makeChainMock({
        data: { third_party_analytics_enabled: false, share_data_with_partners: false, ccpa_do_not_sell: true },
        error: null,
      });
      const historyChain = makeChainMock({ data: [], error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          return callCount === 1 ? privacyChain : historyChain;
        }),
      } as any);

      const res = await GET(new NextRequest('http://localhost/api/cookies/preferences'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preferences.necessary).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/cookies/preferences', {
        method: 'POST',
        body: JSON.stringify({ necessary: true, analytics: false, marketing: false, functional: true, preferences: true }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid preference data', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await POST(new NextRequest('http://localhost/api/cookies/preferences', {
        method: 'POST',
        body: JSON.stringify({ analytics: 'not-a-bool' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 200 on successful preference update', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const updateChain = makeChainMock({ data: null, error: null });
      const insertChain = makeChainMock({ data: null, error: null });
      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          return callCount <= 1 ? updateChain : insertChain;
        }),
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/cookies/preferences', {
        method: 'POST',
        body: JSON.stringify({ necessary: true, analytics: true, marketing: false, functional: true, preferences: true }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await DELETE(new NextRequest('http://localhost/api/cookies/preferences', { method: 'DELETE' }));
      expect(res.status).toBe(401);
    });

    it('returns 200 with reset defaults on success', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const updateChain = makeChainMock({ data: null, error: null });
      const insertChain = makeChainMock({ data: null, error: null });
      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          return callCount <= 1 ? updateChain : insertChain;
        }),
      } as any);

      const res = await DELETE(new NextRequest('http://localhost/api/cookies/preferences', { method: 'DELETE' }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preferences.analytics).toBe(false);
    });
  });
});
