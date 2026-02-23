import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/calendar/connect/apple/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/calendar', () => ({
  appleCalDAVService: {
    validateAppleCredentials: vi.fn(),
    storeAppleCredentials: vi.fn(),
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
  email: 'user@icloud.com',
  app_specific_password: 'abcd-efgh-ijkl-mnop',
  space_id: SPACE_ID,
  sync_direction: 'bidirectional',
};

function makeMockSupabase(options?: {
  user?: unknown;
  spaceMember?: unknown;
  spaceError?: unknown;
  activeConn?: unknown;
  disconnConn?: unknown;
  newConn?: unknown;
  newConnError?: unknown;
}) {
  const spaceMemberChain = createChainMock({
    data: options?.spaceMember !== undefined ? options.spaceMember : { space_id: SPACE_ID, role: 'member' },
    error: options?.spaceError ?? null,
  });
  const activeConnChain = createChainMock({ data: options?.activeConn ?? null, error: null });
  const disconnConnChain = createChainMock({ data: options?.disconnConn ?? null, error: null });
  const newConnChain = createChainMock({
    data: options?.newConn !== undefined ? options.newConn : { id: CONNECTION_ID, space_id: SPACE_ID },
    error: options?.newConnError ?? null,
  });
  const connectionsListChain = createChainMock({ data: [], error: null });
  const updateChain = createChainMock({ data: null, error: null });

  let callCount = 0;
  const fromFn = vi.fn((table: string) => {
    if (table === 'space_members') return spaceMemberChain;
    if (table === 'calendar_connections') {
      callCount++;
      // 1st call: active connection check, 2nd call: disconnected check, 3rd call: insert
      if (callCount === 1) return activeConnChain;
      if (callCount === 2) return disconnConnChain;
      if (callCount >= 3) return newConnChain;
    }
    return updateChain;
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.user !== undefined ? options.user : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
    from: fromFn,
  };
}

describe('/api/calendar/connect/apple', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
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
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: null }) as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when body fails validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', app_specific_password: 'short', space_id: 'not-uuid' }),
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
      vi.mocked(createClient).mockResolvedValue(
        makeMockSupabase({ spaceMember: null, spaceError: { message: 'Not found' } }) as never
      );

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access denied');
    });

    it('returns 409 when Apple Calendar is already connected', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(
        makeMockSupabase({ activeConn: { id: CONNECTION_ID, sync_status: 'active' } }) as never
      );

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('already connected');
    });

    it('returns 400 when Apple credentials are invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { appleCalDAVService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
      vi.mocked(appleCalDAVService.validateAppleCredentials).mockResolvedValue({
        valid: false,
        error: 'Invalid credentials',
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid Apple Calendar credentials');
    });

    it('returns 200 on successful connection', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { appleCalDAVService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);

      const updateChain = createChainMock({ data: null, error: null });
      const supabaseMock = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID, email: 'test@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          ...createChainMock({ data: { space_id: SPACE_ID, role: 'member' }, error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn()
            .mockResolvedValueOnce({ data: { space_id: SPACE_ID, role: 'member' }, error: null }) // space_members
            .mockResolvedValueOnce({ data: null, error: null })   // active conn check
            .mockResolvedValueOnce({ data: null, error: null })   // disconnected conn check
            .mockResolvedValueOnce({ data: { id: CONNECTION_ID }, error: null }), // insert result
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(supabaseMock as never);
      vi.mocked(appleCalDAVService.validateAppleCredentials).mockResolvedValue({
        valid: true,
        calendars: [{ url: 'https://caldav.icloud.com/1234/calendar' }],
      } as never);
      vi.mocked(appleCalDAVService.storeAppleCredentials).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/calendar/connect/apple?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: null }) as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/apple?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/apple');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('space_id');
    });

    it('returns 200 with connections list on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);

      const connListChain = createChainMock({ data: [{ id: CONNECTION_ID }], error: null });
      const supabaseMock = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue(connListChain),
      };
      vi.mocked(createClient).mockResolvedValue(supabaseMock as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/apple?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.connections)).toBe(true);
    });
  });
});
