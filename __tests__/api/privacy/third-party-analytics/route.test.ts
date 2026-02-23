import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/privacy/third-party-analytics/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select','eq','order','insert','update','delete','single','limit','maybeSingle','gte','lte','in','neq','is','not','upsert','rpc','match','or','filter','range','ilike','like','contains','containedBy','textSearch'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('/api/privacy/third-party-analytics POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should return 400 for invalid request body', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ enabled: 'yes' }), // should be boolean
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when trying to update another user', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ userId: '660e8400-e29b-41d4-a716-446655440099', enabled: true }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should update preference successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const chain = createChainMock({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      from: vi.fn(() => chain),
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ enabled: false }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 500 when database update fails', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const chain = createChainMock({ data: null, error: { message: 'DB error' } });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      from: vi.fn(() => chain),
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/third-party-analytics', {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update preference');
  });
});
