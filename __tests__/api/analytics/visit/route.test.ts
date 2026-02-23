import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analytics/visit/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
  fallbackRateLimit: vi.fn(() => true),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['insert', 'select', 'eq'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/analytics/visit', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      vi.mocked(fallbackRateLimit).mockReturnValue(false);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({ path: '/dashboard' }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid beacon payload (empty path)', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      vi.mocked(fallbackRateLimit).mockReturnValue(true);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({ path: '' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid beacon payload (unknown fields on strict schema)', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      vi.mocked(fallbackRateLimit).mockReturnValue(true);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({ path: '/home', unknownField: 'oops' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 204 on successful visit beacon with minimal payload', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(fallbackRateLimit).mockReturnValue(true);
      const insertChain = makeChainMock({ data: null, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(insertChain as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({ path: '/home' }),
      }));
      expect(res.status).toBe(204);
    });

    it('returns 204 on successful visit beacon with full UTM payload', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(fallbackRateLimit).mockReturnValue(true);
      const insertChain = makeChainMock({ data: null, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(insertChain as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({
          path: '/pricing',
          referrer: 'https://google.com',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'launch-2026',
        }),
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'x-vercel-ip-country': 'US',
        },
      }));
      expect(res.status).toBe(204);
    });

    it('returns 500 when database insert fails', async () => {
      const { fallbackRateLimit } = await import('@/lib/ratelimit-fallback');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(fallbackRateLimit).mockReturnValue(true);
      const insertChain = makeChainMock({ data: null, error: { message: 'db error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(insertChain as any);

      const res = await POST(new NextRequest('http://localhost/api/analytics/visit', {
        method: 'POST',
        body: JSON.stringify({ path: '/home' }),
      }));
      expect(res.status).toBe(500);
    });
  });
});
