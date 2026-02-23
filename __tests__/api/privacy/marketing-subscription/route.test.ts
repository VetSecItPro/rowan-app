import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/privacy/marketing-subscription/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

describe('/api/privacy/marketing-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription', {
        method: 'POST',
        body: JSON.stringify({ emailMarketing: false }),
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

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription', {
        method: 'POST',
        body: JSON.stringify({ emailMarketing: false }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 400 for invalid body', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription', {
        method: 'POST',
        body: JSON.stringify({ emailMarketing: 'not-a-boolean' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should update marketing preferences successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const existingPrefs = { user_id: 'user-123', marketing_emails_enabled: true };
      const fetchChain = createChainMock({ data: existingPrefs, error: null });
      const updateChain = createChainMock({ data: null, error: null });
      const logChain = createChainMock({ data: null, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) return fetchChain;
          if (callCount === 2) return updateChain;
          return logChain;
        }),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription', {
        method: 'POST',
        body: JSON.stringify({ emailMarketing: false }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Marketing preferences updated successfully');
    });
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return marketing subscription status', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const prefsChain = createChainMock({ data: { marketing_emails_enabled: false }, error: null });
      const profileChain = createChainMock({ data: { email: 'a@b.com', name: 'Test' }, error: null });
      const historyChain = createChainMock({ data: [], error: null });

      let callCount = 0;
      const { createClient: cc } = await import('@/lib/supabase/server');
      vi.mocked(cc).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) return prefsChain;
          if (callCount === 2) return profileChain;
          return historyChain;
        }),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/marketing-subscription');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preferences.emailMarketing).toBe(false);
    });
  });
});
