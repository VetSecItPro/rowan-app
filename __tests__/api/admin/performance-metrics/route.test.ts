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

describe('/api/admin/performance-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Remove Vercel env vars so tests default to health check path
    delete process.env.VERCEL_API_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
    delete process.env.VERCEL_PROJECT_ID;
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 200 with health source metrics when Vercel is not configured', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // Mock the health check: .from('users').select('id').limit(1) => resolves
      const limitMock = vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null });
      const selectMock = vi.fn().mockReturnValue({ limit: limitMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(true);
      expect(data.source).toBe('health');
      expect(data.metrics).toBeDefined();
      expect(typeof data.metrics.p50).toBe('number');
      expect(typeof data.metrics.p95).toBe('number');
      expect(typeof data.metrics.p99).toBe('number');
    });

    it('returns 200 with placeholder when health check fails', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      // Make the health check throw
      const limitMock = vi.fn().mockRejectedValue(new Error('DB unavailable'));
      const selectMock = vi.fn().mockReturnValue({ limit: limitMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(false);
      expect(data.source).toBe('placeholder');
      expect(data.timestamp).toBeDefined();
    });

    it('returns vercel source metrics when Vercel is configured and API succeeds', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      await setupAuth(true);

      process.env.VERCEL_API_TOKEN = 'test-token';
      process.env.VERCEL_TEAM_ID = 'test-team';
      process.env.VERCEL_PROJECT_ID = 'test-project';

      // Mock global fetch for Vercel API call
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ p50: 120, p95: 350, p99: 500 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.configured).toBe(true);
      expect(data.source).toBe('vercel');
      expect(data.metrics.p50).toBe(120);

      vi.unstubAllGlobals();
    });

    it('falls back to health source when Vercel API call fails', async () => {
      const { GET } = await import('@/app/api/admin/performance-metrics/route');
      await setupAuth(true);
      const { supabaseAdmin } = await import('@/lib/supabase/admin');

      process.env.VERCEL_API_TOKEN = 'test-token';
      process.env.VERCEL_TEAM_ID = 'test-team';
      process.env.VERCEL_PROJECT_ID = 'test-project';

      // Mock fetch to fail
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      // Mock health check to succeed
      const limitMock = vi.fn().mockResolvedValue({ data: [{ id: 'x' }], error: null });
      const selectMock = vi.fn().mockReturnValue({ limit: limitMock });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ select: selectMock } as any);

      const req = new NextRequest('http://localhost/api/admin/performance-metrics');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.source).toBe('health');

      vi.unstubAllGlobals();
    });
  });
});
