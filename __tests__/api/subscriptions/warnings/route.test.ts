import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/subscriptions/warnings/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/feature-access-service', () => ({ getLimitWarnings: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeSupabase(user: unknown) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'Not authenticated' } }) } };
}

describe('/api/subscriptions/warnings', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await GET(new NextRequest('http://localhost/api/subscriptions/warnings'));
      expect(res.status).toBe(429);
      expect((await res.json()).error).toBe('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await GET(new NextRequest('http://localhost/api/subscriptions/warnings'));
      expect(res.status).toBe(401);
    });

    it('returns 400 when threshold is out of range', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await GET(new NextRequest('http://localhost/api/subscriptions/warnings?threshold=2'));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/threshold/i);
    });

    it('returns 200 with warnings on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getLimitWarnings } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(getLimitWarnings).mockResolvedValue([{ feature: 'tasks', percentage: 0.9 }] as any);

      const res = await GET(new NextRequest('http://localhost/api/subscriptions/warnings'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(res.headers.get('Cache-Control')).toContain('private');
    });

    it('uses custom threshold query param', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { getLimitWarnings } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(getLimitWarnings).mockResolvedValue([] as any);

      await GET(new NextRequest('http://localhost/api/subscriptions/warnings?threshold=0.9'));
      expect(getLimitWarnings).toHaveBeenCalledWith('user-1', 0.9);
    });
  });
});
