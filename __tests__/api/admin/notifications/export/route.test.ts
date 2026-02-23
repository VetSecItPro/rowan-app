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

const RATE_LIMIT_OK = { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
const RATE_LIMIT_FAIL = { success: false, limit: 60, remaining: 0, reset: Date.now() + 60000 };
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440011';

const mockNotifications = [
  {
    id: VALID_UUID,
    name: 'Alice',
    email: 'alice@example.com',
    source: 'homepage',
    referrer: null,
    ip_address: null,
    user_agent: null,
    subscribed: true,
    created_at: '2026-01-01T00:00:00Z',
    unsubscribed_at: null,
  },
];

async function setupAuth(valid = true, rateLimit = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
  const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue(
    rateLimit ? RATE_LIMIT_OK : RATE_LIMIT_FAIL
  );

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

function setupSupabaseSuccess() {
  return async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    // Chain: .from().select().order().limit() => resolves
    const limitMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
    const inMock = vi.fn().mockReturnValue({ limit: limitMock });
    const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/notifications/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST ────────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true, false);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid or expired session');
    });

    it('returns 401 when session decryption throws', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 for invalid body schema (extra field)', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ unknownField: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      // Zod strict mode rejects unknown keys
      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid input');
    });

    it('returns CSV response when format is csv', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const limitMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
      const inMock = vi.fn().mockReturnValue({ limit: limitMock });
      const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv', includeAll: true }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
      const text = await res.text();
      expect(text).toContain('ID');
      expect(text).toContain('Email');
      expect(text).toContain('alice@example.com');
    });

    it('returns JSON response when format is json', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const limitMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
      const inMock = vi.fn().mockReturnValue({ limit: limitMock });
      const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.recordCount).toBe(1);
    });

    it('filters by ids when specific ids are provided', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const limitMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
      const inMock = vi.fn().mockReturnValue({ limit: limitMock });
      const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ ids: [VALID_UUID], format: 'json' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 when database query fails', async () => {
      const { POST } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const limitMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const inMock = vi.fn().mockReturnValue({ limit: limitMock });
      const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/export', {
        method: 'POST',
        body: JSON.stringify({ includeAll: true }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to export notifications');
    });
  });

  // ── GET ─────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/export');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/notifications/export/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/notifications/export');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('delegates to POST handler and returns CSV', async () => {
      const { GET } = await import('@/app/api/admin/notifications/export/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const limitMock = vi.fn().mockResolvedValue({ data: mockNotifications, error: null });
      const inMock = vi.fn().mockReturnValue({ limit: limitMock });
      const orderMock = vi.fn().mockReturnValue({ in: inMock, limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/notifications/export');
      const res = await GET(req);

      // GET delegates to POST which defaults to CSV format
      expect(res.status).toBe(200);
    });
  });
});
