import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/mark-conversation-read/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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
  mock.neq = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.single = vi.fn(handler);
  mock.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  return mock;
}

describe('/api/messages/mark-conversation-read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: CONV_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should return 400 for invalid conversationId', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: 'not-a-uuid' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const convChain = createChainMock({ data: { space_id: SPACE_ID }, error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
      from: vi.fn(() => convChain),
    } as any);

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: CONV_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
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

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: CONV_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Conversation not found');
  });

  it('should return 403 when user lacks space access', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const convChain = createChainMock({ data: { space_id: SPACE_ID }, error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => convChain),
    } as any);

    vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: CONV_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });

  it('should mark conversation as read successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    // First call returns conversation; second call (messages update) returns marked IDs
    const convChain = createChainMock({ data: { space_id: SPACE_ID }, error: null });
    const updateChain = createChainMock({ data: [{ id: 'msg-1' }, { id: 'msg-2' }], error: null });

    let callCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => {
        callCount++;
        return callCount === 1 ? convChain : updateChain;
      }),
    } as any);

    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/messages/mark-conversation-read', {
      method: 'POST',
      body: JSON.stringify({ conversationId: CONV_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.markedCount).toBe('number');
  });
});
