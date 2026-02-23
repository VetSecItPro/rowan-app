import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/privacy/data-sharing/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

describe('/api/privacy/data-sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-sharing', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, allowSharing: false }),
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
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      } as never);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-sharing', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, allowSharing: false }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 403 when userId does not match authenticated user', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      } as never);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-sharing', {
        method: 'POST',
        body: JSON.stringify({ userId: '11111111-1111-4111-8111-111111111111', allowSharing: false }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 for invalid request body', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
      } as never);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-sharing', {
        method: 'POST',
        body: JSON.stringify({ userId: 'not-a-uuid', allowSharing: 'yes' }), // invalid types
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should update data sharing preference successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const fetchChain = createChainMock({ data: { share_data_with_partners: true }, error: null });
      const updateChain = createChainMock({ data: null, error: null });
      const insertChain = createChainMock({ data: null, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) return fetchChain;
          if (callCount === 2) return updateChain;
          return insertChain;
        }),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/data-sharing', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, allowSharing: false }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.allowSharing).toBe(false);
      expect(data.data.ccpaDoNotSell).toBe(true);
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

    it('should return data sharing status successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const chain = createChainMock({
        data: {
          ccpa_do_not_sell: true,
          share_data_with_partners: false,
          third_party_analytics_enabled: false,
        },
        error: null,
      });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.ccpaDoNotSell).toBe(true);
      expect(data.data.dataSharingPartners).toHaveLength(4);
    });
  });
});
