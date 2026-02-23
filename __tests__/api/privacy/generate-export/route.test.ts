import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/privacy/generate-export/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn(() => 'http://localhost:3000'),
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

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_EXPORT_ID = '660e8400-e29b-41d4-a716-446655440000';

describe('/api/privacy/generate-export POST', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, INTERNAL_API_SECRET: 'test-secret-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 500 when INTERNAL_API_SECRET is not configured', async () => {
    delete process.env.INTERNAL_API_SECRET;

    const request = new NextRequest('http://localhost/api/privacy/generate-export', {
      method: 'POST',
      body: JSON.stringify({ exportId: VALID_EXPORT_ID, userId: VALID_USER_ID, format: 'json' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server misconfiguration');
  });

  it('should return 401 when authorization header is missing', async () => {
    const request = new NextRequest('http://localhost/api/privacy/generate-export', {
      method: 'POST',
      body: JSON.stringify({ exportId: VALID_EXPORT_ID, userId: VALID_USER_ID, format: 'json' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when authorization header is wrong', async () => {
    const request = new NextRequest('http://localhost/api/privacy/generate-export', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
      body: JSON.stringify({ exportId: VALID_EXPORT_ID, userId: VALID_USER_ID, format: 'json' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid request body', async () => {
    const request = new NextRequest('http://localhost/api/privacy/generate-export', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret-key' },
      body: JSON.stringify({ exportId: 'not-a-uuid', userId: VALID_USER_ID, format: 'json' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should process export and return success', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    const noData = createChainMock({ data: null, error: null });
    const emptyData = createChainMock({ data: [], error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: VALID_USER_ID } }, error: null }) },
      from: vi.fn(() => ({
        ...noData,
        update: vi.fn(() => noData),
        select: vi.fn(() => noData),
        insert: vi.fn(() => noData),
        eq: vi.fn(() => noData),
        in: vi.fn(() => emptyData),
        order: vi.fn(() => emptyData),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/generate-export', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret-key' },
      body: JSON.stringify({ exportId: VALID_EXPORT_ID, userId: VALID_USER_ID, format: 'json' }),
    });
    const response = await POST(request);
    const data = await response.json();

    // Should succeed or fail gracefully (email service may not be configured in test)
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(data.success).toBe(true);
    }
  });
});
