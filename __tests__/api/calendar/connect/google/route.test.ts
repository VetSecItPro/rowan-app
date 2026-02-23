import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/calendar/connect/google/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/calendar', () => ({
  googleCalendarService: {
    generateAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?...'),
    exchangeCodeForTokens: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const CONNECTION_ID = '550e8400-e29b-41d4-a716-446655440011';

const mockRateLimitOk = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const mockRateLimitFail = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const validBody = {
  space_id: SPACE_ID,
  sync_direction: 'bidirectional',
};

function makeSuccessSupabase() {
  const spaceMemberChain = createChainMock({ data: { space_id: SPACE_ID, role: 'member' }, error: null });
  const noActiveConnChain = createChainMock({ data: null, error: null });
  const noDisconnConnChain = createChainMock({ data: null, error: null });
  const newConnChain = createChainMock({ data: { id: CONNECTION_ID, space_id: SPACE_ID }, error: null });
  const updateNonceChain = createChainMock({ data: null, error: null });

  let fromCallCount = 0;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'space_members') return spaceMemberChain;
      if (table === 'calendar_connections') {
        fromCallCount++;
        if (fromCallCount === 1) return noActiveConnChain;   // active check
        if (fromCallCount === 2) return noDisconnConnChain;  // disconnected check
        if (fromCallCount === 3) return newConnChain;        // insert
        return updateNonceChain;                             // update nonce
      }
      return createChainMock({ data: null, error: null });
    }),
  };
}

describe('/api/calendar/connect/google', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 when body fails validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'not-a-uuid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const notMemberChain = createChainMock({ data: null, error: { message: 'Not found' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(notMemberChain),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
    });

    it('returns 409 when Google Calendar is already connected', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const memberChain = createChainMock({ data: { space_id: SPACE_ID, role: 'member' }, error: null });
      const activeConnChain = createChainMock({ data: { id: CONNECTION_ID, sync_status: 'active' }, error: null });

      let count = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'space_members') return memberChain;
          count++;
          if (count === 1) return activeConnChain;
          return createChainMock({ data: null, error: null });
        }),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('already connected');
    });

    it('returns 200 with auth_url on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { googleCalendarService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeSuccessSupabase() as never);
      vi.mocked(googleCalendarService.generateAuthUrl).mockReturnValue('https://accounts.google.com/auth');

      const req = new NextRequest('http://localhost/api/calendar/connect/google', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.auth_url).toBeDefined();
      expect(data.connection_id).toBeDefined();
    });
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/google?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/google');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 200 with connections list', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const connChain = createChainMock({ data: [{ id: CONNECTION_ID, provider: 'google' }], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(connChain),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/google?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.connections)).toBe(true);
    });
  });
});
