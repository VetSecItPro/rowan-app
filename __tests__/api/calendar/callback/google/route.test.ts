import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/calendar/callback/google/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/calendar', () => ({
  googleCalendarService: {
    exchangeCodeForTokens: vi.fn(),
    generateAuthUrl: vi.fn(),
  },
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/utils/app-url', () => ({ getAppUrl: vi.fn(() => 'http://localhost:3000') }));

const CONNECTION_ID = '550e8400-e29b-41d4-a716-446655440011';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

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

function buildOAuthState(overrides?: Partial<{
  connection_id: string;
  space_id: string;
  user_id: string;
  nonce: string;
  timestamp: number;
}>) {
  const state = {
    connection_id: CONNECTION_ID,
    space_id: SPACE_ID,
    user_id: USER_ID,
    ...overrides,
  };
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

function makeMockSupabase(options?: { user?: unknown; connectionData?: unknown; connectionError?: unknown }) {
  const connectionChain = createChainMock({
    data: options?.connectionData !== undefined
      ? options.connectionData
      : { id: CONNECTION_ID, space_id: SPACE_ID, user_id: USER_ID, sync_status: 'disconnected', oauth_state_nonce: null, oauth_state_created_at: null },
    error: options?.connectionError ?? null,
  });
  const updateChain = createChainMock({ data: null, error: null });
  const insertChain = createChainMock({ data: null, error: null });
  const rpcChain = createChainMock({ data: 5, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.user !== undefined ? options.user : { id: USER_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'calendar_connections') return connectionChain;
      if (table === 'calendar_sync_logs') return insertChain;
      return updateChain;
    }),
    rpc: vi.fn().mockResolvedValue({ data: 5, error: null }),
  };
}

describe('/api/calendar/callback/google', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('redirects to error when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitFail);

    const req = new NextRequest('http://localhost/api/calendar/callback/google?code=abc&state=xyz');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('too_many_requests');
  });

  it('redirects to error when Google OAuth error is returned', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);

    const req = new NextRequest('http://localhost/api/calendar/callback/google?error=access_denied&state=xyz');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('google_auth_denied');
  });

  it('redirects to error when state is missing', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);

    // No code or state - will fail ZodError on GoogleOAuthCallbackSchema
    const req = new NextRequest('http://localhost/api/calendar/callback/google?code=&state=');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=');
  });

  it('redirects to error when OAuth state is invalid base64', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);

    const req = new NextRequest('http://localhost/api/calendar/callback/google?code=validcode&state=notbase64!@#');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('invalid_state');
  });

  it('redirects to login when user is not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: null }) as never);

    const state = buildOAuthState();
    const req = new NextRequest(`http://localhost/api/calendar/callback/google?code=validcode&state=${state}`);
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('login');
  });

  it('redirects to error when user_id in state does not match authenticated user', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase({ user: { id: 'different-user-id', email: 'other@example.com' } }) as never);

    const state = buildOAuthState();
    const req = new NextRequest(`http://localhost/api/calendar/callback/google?code=validcode&state=${state}`);
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('user_mismatch');
  });

  it('redirects to error when connection is not found', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(createClient).mockResolvedValue(
      makeMockSupabase({ connectionData: null, connectionError: { message: 'Not found' } }) as never
    );

    const state = buildOAuthState();
    const req = new NextRequest(`http://localhost/api/calendar/callback/google?code=validcode&state=${state}`);
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('connection_not_found');
  });

  it('redirects to error when token exchange fails', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { googleCalendarService } = await import('@/lib/services/calendar');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
    vi.mocked(googleCalendarService.exchangeCodeForTokens).mockResolvedValue({
      success: false,
      error: 'Invalid code',
    } as never);

    const state = buildOAuthState();
    const req = new NextRequest(`http://localhost/api/calendar/callback/google?code=validcode&state=${state}`);
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('token_exchange_failed');
  });

  it('redirects to success when OAuth flow completes successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { googleCalendarService } = await import('@/lib/services/calendar');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk);
    vi.mocked(createClient).mockResolvedValue(makeMockSupabase() as never);
    vi.mocked(googleCalendarService.exchangeCodeForTokens).mockResolvedValue({
      success: true,
    } as never);

    const state = buildOAuthState();
    const req = new NextRequest(`http://localhost/api/calendar/callback/google?code=validcode&state=${state}`);
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('google_connected');
  });
});
