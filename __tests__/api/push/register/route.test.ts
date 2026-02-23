import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/push/register/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/push-notification-service', () => ({
  registerPushToken: vi.fn(),
  unregisterPushToken: vi.fn(),
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
  ['select', 'eq', 'single', 'maybeSingle'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

function makeSupabase(user: unknown, membershipResult?: unknown) {
  const membershipChain = makeChainMock(membershipResult ?? { data: null, error: { message: 'not found' } });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'unauth' },
      }),
    },
    from: vi.fn(() => membershipChain),
  };
}

const validSpaceId = '550e8400-e29b-41d4-a716-446655440002';

describe('/api/push/register', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'tok', platform: 'ios', spaceId: validSpaceId }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'tok', platform: 'ios', spaceId: validSpaceId }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid request body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'tok', platform: 'fax', spaceId: validSpaceId }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ id: 'user-1' }, { data: null, error: { message: 'not found' } }) as any
      );

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'tok', platform: 'ios', spaceId: validSpaceId }),
      }));
      expect(res.status).toBe(403);
    });

    it('returns 200 on successful push token registration', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { registerPushToken } = await import('@/lib/services/push-notification-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ id: 'user-1' }, { data: { space_id: validSpaceId }, error: null }) as any
      );
      vi.mocked(registerPushToken).mockResolvedValue({ success: true, tokenId: 'token-id-abc' });

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token', platform: 'ios', spaceId: validSpaceId }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tokenId).toBe('token-id-abc');
    });

    it('returns 400 when registerPushToken service fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { registerPushToken } = await import('@/lib/services/push-notification-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ id: 'user-1' }, { data: { space_id: validSpaceId }, error: null }) as any
      );
      vi.mocked(registerPushToken).mockResolvedValue({ success: false, error: 'Token already exists' });

      const res = await POST(new NextRequest('http://localhost/api/push/register', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token', platform: 'android', spaceId: validSpaceId }),
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Token already exists');
    });
  });

  describe('DELETE', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const res = await DELETE(new NextRequest('http://localhost/api/push/register', {
        method: 'DELETE',
        body: JSON.stringify({ token: 'device-token' }),
      }));
      expect(res.status).toBe(429);
    });

    it('returns 401 when user is not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const res = await DELETE(new NextRequest('http://localhost/api/push/register', {
        method: 'DELETE',
        body: JSON.stringify({ token: 'device-token' }),
      }));
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid body (missing token)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);

      const res = await DELETE(new NextRequest('http://localhost/api/push/register', {
        method: 'DELETE',
        body: JSON.stringify({ token: '' }),
      }));
      expect(res.status).toBe(400);
    });

    it('returns 200 on successful push token unregistration', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { unregisterPushToken } = await import('@/lib/services/push-notification-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(unregisterPushToken).mockResolvedValue({ success: true });

      const res = await DELETE(new NextRequest('http://localhost/api/push/register', {
        method: 'DELETE',
        body: JSON.stringify({ token: 'device-token' }),
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
