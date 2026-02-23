import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/settings/privacy-data/route';

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

describe('/api/settings/privacy-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/settings/privacy-data');
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
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/settings/privacy-data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return default privacy data settings', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/settings/privacy-data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dataProcessing).toBeDefined();
      expect(data.data.dataRetention).toBeDefined();
      expect(data.data.dataSources).toBeDefined();
      expect(data.data.dataProcessing.essential).toBe(true);
      expect(data.data.dataProcessing.analytics).toBe(false);
    });
  });

  describe('POST', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/settings/privacy-data', {
        method: 'POST',
        body: JSON.stringify({
          dataProcessing: { analytics: true, marketing: false, functional: true, essential: true },
          dataRetention: { messages: '1 year', analytics: '6 months', logs: '30 days' },
          dataSources: { browser: true, device: false, location: false, thirdParty: false },
        }),
      });
      const response = await POST(request);
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

      const request = new NextRequest('http://localhost/api/settings/privacy-data', {
        method: 'POST',
        body: JSON.stringify({
          dataProcessing: { analytics: true, marketing: false, functional: true, essential: true },
          dataRetention: { messages: '1 year', analytics: '6 months', logs: '30 days' },
          dataSources: { browser: true, device: false, location: false, thirdParty: false },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid settings schema', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/settings/privacy-data', {
        method: 'POST',
        body: JSON.stringify({
          dataProcessing: { analytics: 'yes', marketing: false, functional: true, essential: true }, // analytics should be boolean
          dataRetention: { messages: '1 year', analytics: '6 months', logs: '30 days' },
          dataSources: { browser: true, device: false, location: false, thirdParty: false },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should update settings successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const settings = {
        dataProcessing: { analytics: true, marketing: false, functional: true, essential: true },
        dataRetention: { messages: '1 year', analytics: '6 months', logs: '30 days' },
        dataSources: { browser: true, device: false, location: false, thirdParty: false },
      };

      const request = new NextRequest('http://localhost/api/settings/privacy-data', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Privacy data settings updated');
      expect(data.data.dataProcessing.analytics).toBe(true);
    });
  });
});
