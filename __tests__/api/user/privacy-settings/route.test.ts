import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/user/privacy-settings/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null),
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

describe('/api/user/privacy-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
      } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return default settings when profile has no privacy_settings column', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const chain = createChainMock({ data: null, error: { message: 'column "privacy_settings" does not exist' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profileVisibility).toBe(true);
    });

    it('should return stored privacy settings', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const settings = { profileVisibility: false, activityStatus: true, readReceipts: false, analytics: true };
      const chain = createChainMock({ data: { privacy_settings: settings }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.profileVisibility).toBe(false);
    });
  });

  describe('PATCH', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings', {
        method: 'PATCH',
        body: JSON.stringify({ analytics: false }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings', {
        method: 'PATCH',
        body: JSON.stringify({ analytics: false }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should update privacy settings successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const updatedSettings = { profileVisibility: true, activityStatus: true, readReceipts: true, analytics: false };
      const fetchChain = createChainMock({ data: { privacy_settings: { profileVisibility: true, activityStatus: true, readReceipts: true, analytics: true } }, error: null });
      const updateChain = createChainMock({ data: { privacy_settings: updatedSettings }, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          return callCount === 1 ? fetchChain : updateChain;
        }),
      } as never);

      const request = new NextRequest('http://localhost/api/user/privacy-settings', {
        method: 'PATCH',
        body: JSON.stringify({ analytics: false }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Privacy settings updated successfully');
    });
  });
});
