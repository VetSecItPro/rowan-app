import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/privacy/download-export/route';

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

describe('/api/privacy/download-export GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when file parameter is missing', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/download-export');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('File parameter is required');
  });

  it('should return 401 when not authenticated and no token', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/download-export?file=export.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 429 when rate limited', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/privacy/download-export?file=export.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
  });

  it('should return 404 when export record not found', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const notFoundChain = createChainMock({ data: null, error: { message: 'Not found' } });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      from: vi.fn(() => notFoundChain),
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/download-export?file=nonexistent.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should return 410 when export has expired', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const pastExpiry = new Date(Date.now() - 86400000).toISOString();
    const expiredRecord = {
      id: 'exp-1',
      user_id: 'user-123',
      status: 'completed',
      file_url: 'https://example.com/export.json',
      expires_at: pastExpiry,
    };
    const exportChain = createChainMock({ data: expiredRecord, error: null });
    const logChain = createChainMock({ data: null, error: null });

    let callCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      from: vi.fn(() => (callCount++ === 0 ? exportChain : logChain)),
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/download-export?file=export.json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toContain('expired');
  });
});
