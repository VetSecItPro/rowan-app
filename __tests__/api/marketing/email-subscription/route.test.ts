import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/marketing/email-subscription/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'single', 'maybeSingle', 'upsert'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const validUserId = '00000000-0000-4000-8000-000000000001';

describe('/api/marketing/email-subscription', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/marketing/email-subscription', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', subscribed: true, userId: validUserId }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const res = await POST(new NextRequest('http://localhost/api/marketing/email-subscription', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-email', subscribed: true, userId: validUserId }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: null }, error: { message: 'unauth' } } as any);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/marketing/email-subscription', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', subscribed: true, userId: validUserId }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 200 on successful subscription update', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: { id: validUserId } }, error: null } as any);
      // Profile check - email matches
      const profileChain = makeChainMock({ data: { email: 'a@b.com' }, error: null });
      // Upsert chain
      const upsertChain = makeChainMock({ data: null, error: null });
      let fromCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        fromCount++;
        return fromCount === 1 ? profileChain as any : upsertChain as any;
      });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      } as any);

      const res = await POST(new NextRequest('http://localhost/api/marketing/email-subscription', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', subscribed: true, userId: validUserId }),
        headers: { authorization: `Bearer fake-token` },
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
