import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analytics/track/route';

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
  ['select', 'eq', 'limit', 'single'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

function makeSupabase(user: unknown, spaceMemberResult?: unknown) {
  const memberChain = makeChainMock(spaceMemberResult ?? { data: null, error: null });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn(() => memberChain),
    rpc: vi.fn().mockResolvedValue({ data: 'event-id-1', error: null }),
  };
}

describe('/api/analytics/track', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ feature: 'tasks', action: 'page_view' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(429);
      expect(data.success).toBe(false);
    });

    it('returns 400 for invalid event (bad feature)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ feature: 'invalid_feature', action: 'page_view' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 for invalid event (bad action)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ feature: 'tasks', action: 'click' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 200 for single event from anonymous user', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      // Anonymous user — getUser returns null
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ feature: 'tasks', action: 'page_view' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recorded).toBe(1);
    });

    it('returns 200 for single event from authenticated user', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ id: 'user-1' }, { data: { space_id: 'space-1' }, error: null }) as any
      );

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ feature: 'meals', action: 'create', metadata: { mealType: 'dinner' } }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recorded).toBe(1);
    });

    it('returns 400 for batch with invalid events array', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ events: [] }), // min 1 required
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 200 for valid batch events', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/track', {
        method: 'POST',
        body: JSON.stringify({
          events: [
            { feature: 'tasks', action: 'page_view' },
            { feature: 'goals', action: 'create' },
          ],
        }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recorded).toBe(2);
    });
  });
});
