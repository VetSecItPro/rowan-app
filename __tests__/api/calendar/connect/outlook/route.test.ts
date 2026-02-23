import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/calendar/connect/outlook/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/calendar', () => ({
  outlookCalendarService: {
    generateAuthUrl: vi.fn(() => 'https://login.microsoftonline.com/auth?...'),
    exchangeCodeForTokens: vi.fn(),
    storeTokens: vi.fn(),
    getUserProfile: vi.fn(),
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

describe('/api/calendar/connect/outlook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook', {
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

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 when body fails validation (space_id is not a UUID)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'not-a-uuid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      // The CalendarProviderSchema only includes ['google','apple','cozi'] so
      // 'outlook' provider injected by the route will fail Zod validation.
      // Combined with invalid space_id, this always produces a 400.
      expect(res.status).toBe(400);
    });

    it('returns 400 when ConnectCalendarRequestSchema rejects outlook provider', async () => {
      // NOTE: This test documents a known limitation: the CalendarProviderSchema in
      // calendar-integration-schemas.ts does not include 'outlook'. The route injects
      // provider:'outlook' into the parse call, causing Zod to always reject with 400.
      // Until the schema is updated to include 'outlook', the 403/409/200 branches are
      // unreachable via this schema path.
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it('returns 500 on unexpected infrastructure error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockRejectedValue(new Error('DB connection failed'));

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook', {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

      const req = new NextRequest(`http://localhost/api/calendar/connect/outlook?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        from: vi.fn(),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/outlook?space_id=${SPACE_ID}`);
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

      const req = new NextRequest('http://localhost/api/calendar/connect/outlook');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('space_id');
    });

    it('returns 200 with connections list on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const connChain = createChainMock({ data: [{ id: CONNECTION_ID, provider: 'outlook' }], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(connChain),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/outlook?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.connections)).toBe(true);
    });

    it('returns 500 when DB query fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
      const errorChain = createChainMock({ data: null, error: { message: 'DB error' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn().mockReturnValue(errorChain),
      } as never);

      const req = new NextRequest(`http://localhost/api/calendar/connect/outlook?space_id=${SPACE_ID}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
    });
  });
});
