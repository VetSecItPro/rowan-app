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

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
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

const mockToken = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  token: 'abc123def456',
  label: 'Test Token',
  expires_at: '2027-01-01T00:00:00Z',
  created_by: ADMIN_ID,
  last_accessed: null,
  access_count: 0,
  is_revoked: false,
  created_at: '2026-01-01T00:00:00Z',
};

async function setupAuth(valid = true) {
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
  vi.mocked(verifyAdminAuth).mockResolvedValue(
    valid
      ? { isValid: true, adminId: ADMIN_ID }
      : { isValid: false, error: 'Admin authentication required' }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/investor-tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET ─────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/investor-tokens/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when not authenticated', async () => {
      const { GET } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('returns 200 with tokens for authenticated admin', async () => {
      const { GET } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const chain = createChainMock({ data: [mockToken], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tokens).toBeDefined();
    });

    it('returns 500 when database query fails', async () => {
      const { GET } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to fetch tokens');
    });

    it('returns empty array when no tokens exist', async () => {
      const { GET } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const chain = createChainMock({ data: null, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tokens).toEqual([]);
    });
  });

  // ── POST ────────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ expiryDays: 30 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ expiryDays: 30 }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when expiryDays is missing', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ label: 'Test' }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid expiryDays');
    });

    it('returns 400 when expiryDays is not a positive number', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ expiryDays: -5 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid expiryDays');
    });

    it('returns 200 with new token on success', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const newToken = {
        id: mockToken.id,
        token: mockToken.token,
        label: 'Investor Portal',
        expires_at: '2027-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      };

      // The chain needs: .from().insert().select().single() => resolves with { data, error }
      const singleMock = vi.fn().mockResolvedValue({ data: newToken, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ label: 'Investor Portal', expiryDays: 30 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
    });

    it('returns 500 when token insertion fails', async () => {
      const { POST } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens', {
        method: 'POST',
        body: JSON.stringify({ expiryDays: 30 }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to create token');
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { DELETE } = await import('@/app/api/admin/investor-tokens/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens?id=550e8400-e29b-41d4-a716-446655440010');
      const res = await DELETE(req);

      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { DELETE } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens?id=550e8400-e29b-41d4-a716-446655440010');
      const res = await DELETE(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when token ID is missing from query params', async () => {
      const { DELETE } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens');
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Token ID is required');
    });

    it('returns 200 when token is revoked successfully', async () => {
      const { DELETE } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens?id=550e8400-e29b-41d4-a716-446655440010');
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 when revoke operation fails', async () => {
      const { DELETE } = await import('@/app/api/admin/investor-tokens/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateMock } as any);

      const req = new NextRequest('http://localhost/api/admin/investor-tokens?id=550e8400-e29b-41d4-a716-446655440010');
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to revoke token');
    });
  });
});
