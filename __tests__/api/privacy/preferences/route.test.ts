import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/privacy/preferences/route';

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

describe('/api/privacy/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences');
      const response = await GET(request);
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

      const request = new NextRequest('http://localhost/api/privacy/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should create and return default preferences when none exist', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const defaultPrefs = { user_id: 'user-123', ccpa_do_not_sell: true, marketing_emails_enabled: false };
      const fetchChain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      const insertChain = createChainMock({ data: defaultPrefs, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => (callCount++ === 0 ? fetchChain : insertChain)),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.ccpa_do_not_sell).toBe(true);
    });

    it('should return existing preferences', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const prefs = { user_id: 'user-123', ccpa_do_not_sell: false, marketing_emails_enabled: true };
      const chain = createChainMock({ data: prefs, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.marketing_emails_enabled).toBe(true);
    });
  });

  describe('PATCH', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ marketing_emails_enabled: false }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid body', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ marketing_emails_enabled: 'yes' }), // should be boolean
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should update preferences successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const updatedPrefs = { user_id: 'user-123', marketing_emails_enabled: true, ccpa_do_not_sell: false };
      const updateChain = createChainMock({ data: updatedPrefs, error: null });
      const auditChain = createChainMock({ data: null, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => (callCount++ === 0 ? updateChain : auditChain)),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ marketing_emails_enabled: true }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Privacy preferences updated successfully');
    });
  });
});
