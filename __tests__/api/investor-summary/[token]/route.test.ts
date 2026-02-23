import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/investor-summary/[token]/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const VALID_TOKEN_DATA = {
  id: 'token-1',
  expires_at: FUTURE_DATE,
  is_revoked: false,
  access_count: 5,
};

async function callGET(token: string) {
  const request = new NextRequest(`http://localhost/api/investor-summary/${token}`, {
    method: 'GET',
  });
  const context = { params: Promise.resolve({ token }) };
  return GET(request, context);
}

describe('/api/investor-summary/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await callGET('some-token');
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return 401 for invalid token', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const chain = createChainMock({ data: null, error: { message: 'Not found' } });
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain as ReturnType<typeof supabaseAdmin.from>);

    const response = await callGET('invalid-token');
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid or expired token');
  });

  it('should return 401 when token is revoked', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    // First call: token lookup returns revoked token
    // Subsequent calls: metrics queries all return empty
    let callCount = 0;
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainMock({
          data: { ...VALID_TOKEN_DATA, is_revoked: true },
          error: null,
        }) as ReturnType<typeof supabaseAdmin.from>;
      }
      return createChainMock({ data: [], error: null, count: 0 }) as ReturnType<typeof supabaseAdmin.from>;
    });

    const response = await callGET('revoked-token');
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('revoked');
  });

  it('should return 401 when token is expired', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    let callCount = 0;
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainMock({
          data: { ...VALID_TOKEN_DATA, expires_at: PAST_DATE },
          error: null,
        }) as ReturnType<typeof supabaseAdmin.from>;
      }
      return createChainMock({ data: [], error: null, count: 0 }) as ReturnType<typeof supabaseAdmin.from>;
    });

    const response = await callGET('expired-token');
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('expired');
  });

  it('should return metrics for valid token', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    let callCount = 0;
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      callCount++;
      // First call: token validation
      if (callCount === 1) {
        return createChainMock({ data: VALID_TOKEN_DATA, error: null }) as ReturnType<typeof supabaseAdmin.from>;
      }
      // Second call: token update (access_count)
      if (callCount === 2) {
        return createChainMock({ data: null, error: null }) as ReturnType<typeof supabaseAdmin.from>;
      }
      // Remaining calls: metrics queries
      if (table === 'users') {
        return createChainMock({ data: [], error: null, count: 100 }) as ReturnType<typeof supabaseAdmin.from>;
      }
      return createChainMock({ data: [], error: null, count: 0 }) as ReturnType<typeof supabaseAdmin.from>;
    });

    const response = await callGET('valid-token');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.metrics).toBeDefined();
    expect(data.generatedAt).toBeDefined();
  });

  it('should return 500 on unexpected error', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockRejectedValue(new Error('Unexpected'));

    const response = await callGET('any-token');
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
