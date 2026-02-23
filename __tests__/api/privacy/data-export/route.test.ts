import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/privacy/data-export/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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
  // Add storage mock
  (mock as Record<string, unknown>).storage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' } }),
    })),
  };
  return mock;
}

describe('/api/privacy/data-export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when rate limited', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 400 for invalid format', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-export', {
        method: 'POST',
        body: JSON.stringify({ format: 'xlsx' }), // not supported
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should return 409 when export already pending', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const existingChain = createChainMock({ data: [{ id: 'exp-1', status: 'pending', created_at: new Date().toISOString() }], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => existingChain),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('pending export');
    });

    it('should create export request successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const exportRequest = { id: 'exp-new', status: 'pending', export_format: 'json' };
      const noExistingChain = createChainMock({ data: [], error: null });
      const insertChain = createChainMock({ data: exportRequest, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => (callCount++ === 0 ? noExistingChain : insertChain)),
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
            createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' } }),
          })),
        },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.exportId).toBe('exp-new');
      expect(data.message).toContain('email when your export is ready');
    });
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return hasActiveRequest false when no export requests', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: [], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.hasActiveRequest).toBe(false);
    });

    it('should return export status for latest request', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const futureExpiry = new Date(Date.now() + 86400000).toISOString();
      const exportReq = {
        id: 'exp-1',
        status: 'completed',
        file_url: 'https://example.com/export.json',
        expires_at: futureExpiry,
        file_size_bytes: 1024,
        export_format: 'json',
        created_at: new Date().toISOString(),
      };
      const chain = createChainMock({ data: [exportReq], error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('completed');
      expect(data.data.format).toBe('json');
    });
  });
});
