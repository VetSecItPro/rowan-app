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

vi.mock('@/lib/services/admin-cache-service', () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
  ADMIN_CACHE_KEYS: {
    retention: vi.fn((range: string) => `retention:${range}`),
  },
  ADMIN_CACHE_TTL: {
    analytics: 900,
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

/**
 * Build a chain that resolves to { data, count, error }.
 * All query-builder methods chain back to themselves.
 */
function buildCountChain(count: number) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data: null, count, error: null })
  );
  return chain;
}

function buildDataChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['eq', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'neq', 'is'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
    resolve({ data, count: null, error: null })
  );
  return chain;
}

/**
 * Set up supabaseAdmin.from to return resolved values for all retention queries.
 * Retention queries in Promise.allSettled order: dau, wau, mau, allUsers, featureEvents
 */
async function setupSupabaseRetentionMocks() {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  let callIndex = 0;
  vi.mocked(supabaseAdmin.from).mockImplementation(() => {
    const idx = callIndex++;
    // Count queries 0=dau, 1=wau, 2=mau
    if (idx < 3) {
      const counts = [10, 50, 100];
      return { select: vi.fn(() => buildCountChain(counts[idx])) } as any;
    }
    // Data queries: allUsers (idx 3), featureEvents (idx 4)
    return { select: vi.fn(() => buildDataChain([])) } as any;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/admin/retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_FAIL);

      const req = new NextRequest('http://localhost/api/admin/retention');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin session cookie is absent', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(false);

      const req = new NextRequest('http://localhost/api/admin/retention');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 401 when session validation fails', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData, validateSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'encrypted' }),
      } as any);
      vi.mocked(decryptSessionData).mockResolvedValue({ adminId: ADMIN_ID });
      vi.mocked(validateSessionData).mockReturnValue(false);

      const req = new NextRequest('http://localhost/api/admin/retention');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Session expired or invalid');
    });

    it('returns 401 when session decryption throws', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { safeCookiesAsync } = await import('@/lib/utils/safe-cookies');
      const { decryptSessionData } = await import('@/lib/utils/session-crypto-edge');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(RATE_LIMIT_OK);
      vi.mocked(safeCookiesAsync).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'bad' }),
      } as any);
      vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

      const req = new NextRequest('http://localhost/api/admin/retention');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid session');
    });

    it('returns 400 for invalid range parameter', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);

      const req = new NextRequest('http://localhost/api/admin/retention?range=99d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid query parameters');
    });

    it('returns 200 with retention data for authenticated admin (default 30d)', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);
      await setupSupabaseRetentionMocks();

      const req = new NextRequest('http://localhost/api/admin/retention');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.retention).toBeDefined();
      expect(data.retention.dau).toBeDefined();
      expect(data.retention.wau).toBeDefined();
      expect(data.retention.mau).toBeDefined();
      expect(data.retention.stickiness).toBeDefined();
      expect(data.retention.cohorts).toBeDefined();
      expect(data.retention.churn).toBeDefined();
    });

    it('accepts 7d range parameter', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);
      await setupSupabaseRetentionMocks();

      const req = new NextRequest('http://localhost/api/admin/retention?range=7d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('accepts 90d range parameter', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);
      await setupSupabaseRetentionMocks();

      const req = new NextRequest('http://localhost/api/admin/retention?range=90d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes stickinessLabel in response', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);
      await setupSupabaseRetentionMocks();

      const req = new NextRequest('http://localhost/api/admin/retention?range=30d');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.retention.stickinessLabel).toBeDefined();
      expect(typeof data.retention.stickinessLabel).toBe('string');
    });

    it('bypasses cache when refresh=true', async () => {
      const { GET } = await import('@/app/api/admin/retention/route');
      await setupAuth(true);
      await setupSupabaseRetentionMocks();
      const { withCache } = await import('@/lib/services/admin-cache-service');

      const req = new NextRequest('http://localhost/api/admin/retention?refresh=true');
      await GET(req);

      expect(withCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ skipCache: true })
      );
    });
  });
});
