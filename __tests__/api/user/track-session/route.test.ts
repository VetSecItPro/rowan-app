import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/user/track-session/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/session-tracking-service', () => ({
  parseUserAgent: vi.fn(() => ({
    device_type: 'desktop',
    browser: 'Chrome',
    browser_version: '120',
    os: 'macOS',
    os_version: '14',
    device_name: 'MacBook Pro',
  })),
  getLocationFromIP: vi.fn(async () => ({
    ip_address: '1.2.3.4',
    city: 'Dallas',
    region: 'Texas',
    country: 'United States',
    country_code: 'US',
    latitude: 32.7767,
    longitude: -96.797,
  })),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
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

describe('/api/user/track-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new Request('http://localhost/api/user/track-session', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
      } as never);

      const request = new Request('http://localhost/api/user/track-session', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should track session successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const sessionResult = { id: 'session-abc' };
      const upsertChain = createChainMock({ data: sessionResult, error: null });
      const updateChain = createChainMock({ data: null, error: null });

      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'a@b.com' } }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'user_sessions') {
            return {
              upsert: vi.fn(() => upsertChain),
              update: vi.fn(() => updateChain),
            };
          }
          return updateChain;
        }),
      } as never);

      const request = new Request('http://localhost/api/user/track-session', {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe('session-abc');
    });

    it('should return 500 when session creation fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const upsertChain = createChainMock({ data: null, error: { message: 'DB error' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'a@b.com' } }, error: null }) },
        from: vi.fn(() => ({
          upsert: vi.fn(() => upsertChain),
        })),
      } as never);

      const request = new Request('http://localhost/api/user/track-session', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create session');
    });
  });
});
