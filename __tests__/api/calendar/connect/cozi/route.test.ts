import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, DELETE } from '@/app/api/calendar/connect/cozi/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/calendar', () => ({
  icsImportService: {
    validateICSUrl: vi.fn(),
    testICSFeed: vi.fn(),
    syncICSFeed: vi.fn(),
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
  url: 'https://www.cozi.com/ical/family123.ics',
  family_member: 'Mom',
};

function makeSuccessSupabase() {
  const spaceMemberChain = createChainMock({ data: { space_id: SPACE_ID, role: 'member' }, error: null });
  const noActiveConnChain = createChainMock({ data: null, error: null });
  const insertedConnChain = createChainMock({ data: { id: CONNECTION_ID, space_id: SPACE_ID }, error: null });
  const insertLogChain = createChainMock({ data: null, error: null });

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
        if (fromCallCount === 1) return noActiveConnChain; // active conn check
        return insertedConnChain; // insert new conn
      }
      if (table === 'calendar_sync_logs') return insertLogChain;
      return createChainMock({ data: null, error: null });
    }),
  };
}

describe('/api/calendar/connect/cozi', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
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

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when body fails Zod validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'bad-id', url: 'not-a-url' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 400 when URL is not a Cozi URL', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { icsImportService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);
      vi.mocked(icsImportService.validateICSUrl).mockReturnValue({
        valid: true,
        normalizedUrl: 'https://othercalendar.com/cal.ics',
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, url: 'https://othercalendar.com/cal.ics' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Cozi');
    });

    it('returns 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { icsImportService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const spaceErrorChain = createChainMock({ data: null, error: { message: 'Not found' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(spaceErrorChain),
      } as never);
      vi.mocked(icsImportService.validateICSUrl).mockReturnValue({
        valid: true,
        normalizedUrl: 'https://www.cozi.com/ical/family123.ics',
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('access denied');
    });

    it('returns 200 on successful Cozi connection', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { icsImportService } = await import('@/lib/services/calendar');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue(makeSuccessSupabase() as never);
      vi.mocked(icsImportService.validateICSUrl).mockReturnValue({
        valid: true,
        normalizedUrl: 'https://www.cozi.com/ical/family123.ics',
      } as never);
      vi.mocked(icsImportService.testICSFeed).mockResolvedValue({
        success: true,
        eventCount: 12,
        calendarName: 'Family Calendar',
      } as never);
      vi.mocked(icsImportService.syncICSFeed).mockResolvedValue({
        success: true,
        eventsProcessed: 12,
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
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

      const req = new NextRequest(`http://localhost/api/calendar/connect/cozi?space_id=${SPACE_ID}`);
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

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('space_id');
    });

    it('returns 200 with connections list', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const connChain = createChainMock({ data: [{ id: CONNECTION_ID }], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(connChain),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/cozi?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.connections)).toBe(true);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/cozi?connection_id=${CONNECTION_ID}`, {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 when connection_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/cozi', {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('connection_id');
    });

    it('returns 404 when connection is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const notFoundChain = createChainMock({ data: null, error: { message: 'Not found' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(notFoundChain),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/cozi?connection_id=${CONNECTION_ID}`, {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(404);
    });

    it('returns 200 on successful deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const connChain = createChainMock({ data: { id: CONNECTION_ID, user_id: USER_ID, provider: 'cozi' }, error: null });
      const deleteChain = createChainMock({ data: null, error: null });

      const callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue({
          ...connChain,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
            .mockResolvedValueOnce({ data: { id: CONNECTION_ID, user_id: USER_ID, provider: 'cozi' }, error: null }),
          delete: vi.fn().mockReturnValue(deleteChain),
        }),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/cozi?connection_id=${CONNECTION_ID}`, {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
