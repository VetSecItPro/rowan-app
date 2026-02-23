import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

vi.mock('@/lib/utils/admin-audit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';

const VALID_ID_1 = '550e8400-e29b-41d4-a716-446655440011';
const VALID_ID_2 = '550e8400-e29b-41d4-a716-446655440012';

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);

  if (!valid) {
    vi.mocked(safeCookiesAsync).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    return;
  }

  vi.mocked(safeCookiesAsync).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'encrypted-session' }),
  } as any);
  vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID, email: 'admin@example.com' });
  vi.mocked(validateSessionData).mockReturnValue(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/notifications/bulk-unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted-session' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid or expired session');
    });

    it('returns 401 when session decryption throws', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad-session' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 when ids array is empty', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid input');
    });

    it('returns 400 when ids contains non-UUID strings', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: ['not-a-uuid'] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('returns 200 with processed count on success', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const updatedRecords = [
        { id: VALID_ID_1, email: 'user1@example.com', name: 'User 1' },
        { id: VALID_ID_2, email: 'user2@example.com', name: 'User 2' },
      ];

      // Chain: .from().update().in().eq().select() => resolves
      const selectMock = vi.fn().mockResolvedValue({ data: updatedRecords, error: null });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const inMock = vi.fn().mockReturnValue({ eq: eqMock });
      const updateMock = vi.fn().mockReturnValue({ in: inMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1, VALID_ID_2] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processedCount).toBe(2);
      expect(data.requestedCount).toBe(2);
    });

    it('returns 500 when database update throws', async () => {
      const { POST } = await import('@/app/api/admin/notifications/bulk-unsubscribe/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const selectMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const inMock = vi.fn().mockReturnValue({ eq: eqMock });
      const updateMock = vi.fn().mockReturnValue({ in: inMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/bulk-unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_ID_1] }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to process bulk unsubscribe');
    });
  });
});
