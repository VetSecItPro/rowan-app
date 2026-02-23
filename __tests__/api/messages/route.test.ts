import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/messages/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    getMessages: vi.fn(),
    createMessage: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/middleware/usage-check', () => ({
  checkUsageLimit: vi.fn(),
  trackUsage: vi.fn(),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text),
  sanitizeUrl: vi.fn((url) => url),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withDynamicDataCache: vi.fn((response) => response),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const CONV_ID = '00000000-0000-4000-8000-000000000020';
const SPACE_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000001';

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.order = vi.fn(handler);
  mock.insert = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.delete = vi.fn(handler);
  mock.single = vi.fn(handler);
  mock.limit = vi.fn(handler);
  mock.maybeSingle = vi.fn(handler);
  mock.gte = vi.fn(handler);
  mock.lte = vi.fn(handler);
  mock.in = vi.fn(handler);
  mock.neq = vi.fn(handler);
  mock.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  return mock;
}

describe('/api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
      });

      const request = new NextRequest(
        `http://localhost/api/messages?conversation_id=${CONV_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(
        `http://localhost/api/messages?conversation_id=${CONV_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid conversation_id', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest(
        'http://localhost/api/messages?conversation_id=not-a-uuid',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 404 when conversation not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const convChain = createChainMock({ data: null, error: { message: 'not found' } });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => convChain),
      } as any);

      const request = new NextRequest(
        `http://localhost/api/messages?conversation_id=${CONV_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should return messages successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { messagesService } = await import('@/lib/services/messages-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const convChain = createChainMock({
        data: { space_id: SPACE_ID },
        error: null,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn(() => convChain),
      } as any);

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockMessages = [
        { id: 'msg-1', content: 'Hello', sender_id: USER_ID },
        { id: 'msg-2', content: 'World', sender_id: USER_ID },
      ];

      vi.mocked(messagesService.getMessages).mockResolvedValue({
        messages: mockMessages as any,
        hasMore: false,
        nextCursor: null,
      });

      const request = new NextRequest(
        `http://localhost/api/messages?conversation_id=${CONV_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMessages);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          space_id: SPACE_ID,
          content: 'Hello!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when daily message limit reached', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: false,
        message: 'Daily message limit reached',
        currentUsage: 100,
        limit: 100,
        remaining: 0,
      });

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, content: 'Hello!' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.upgradeRequired).toBe(true);
    });

    it('should return 400 for validation error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true, currentUsage: 0, limit: 100, remaining: 100,
      });

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        // Missing required content field
        body: JSON.stringify({ space_id: SPACE_ID }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should create message successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit, trackUsage } = await import('@/lib/middleware/usage-check');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { messagesService } = await import('@/lib/services/messages-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true, currentUsage: 0, limit: 100, remaining: 100,
      });

      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

      const mockMessage = {
        id: 'msg-new',
        content: 'Hello!',
        sender_id: USER_ID,
        space_id: SPACE_ID,
      };

      vi.mocked(messagesService.createMessage).mockResolvedValue(mockMessage as any);
      vi.mocked(trackUsage).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, content: 'Hello!' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('msg-new');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { checkUsageLimit } = await import('@/lib/middleware/usage-check');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
      } as any);

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true, currentUsage: 0, limit: 100, remaining: 100,
      });

      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, content: 'Hello!' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });
  });
});
