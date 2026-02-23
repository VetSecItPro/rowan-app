import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// VAPID keys must be set before route module loads (captured at module level)
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
});

import { POST } from '@/app/api/notifications/send-push/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
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

const USER_ID = '00000000-0000-4000-8000-000000000001';
const TARGET_USER_ID = '00000000-0000-4000-8000-000000000002';
const SPACE_ID = '00000000-0000-4000-8000-000000000003';

const validPayload = {
  title: 'Test notification',
  body: 'This is a test',
};

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  return mock;
}

describe('/api/notifications/send-push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      body: JSON.stringify({ userId: TARGET_USER_ID, payload: validPayload }),
    });

    const response = await POST(request);
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

    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      body: JSON.stringify({ userId: TARGET_USER_ID, payload: validPayload }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should proceed past VAPID check when keys are configured at module load', async () => {
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

    // Send invalid body - should get 400 (past VAPID check), not 503
    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      body: JSON.stringify({ userId: TARGET_USER_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 400 for invalid single push body', async () => {
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

    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      // Missing payload
      body: JSON.stringify({ userId: TARGET_USER_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 403 when caller cannot notify target user', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    // Caller is in space A, target user is in space B (no overlap)
    const callerSpacesChain = createChainMock({ data: [{ space_id: 'space-A' }], error: null });
    const targetSpacesChain = createChainMock({ data: [{ space_id: 'space-B' }], error: null });

    const fromMock = vi.fn()
      .mockReturnValueOnce(callerSpacesChain)
      .mockReturnValueOnce(targetSpacesChain);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: fromMock,
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      body: JSON.stringify({ userId: TARGET_USER_ID, payload: validPayload }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not authorized to send notifications to this user');
  });

  it('should send push notification successfully when users share a space', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const webpush = (await import('web-push')).default;

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    // Space membership check: both in same space
    const callerSpacesChain = createChainMock({ data: [{ space_id: SPACE_ID }], error: null });
    const targetSpacesChain = createChainMock({ data: [{ space_id: SPACE_ID }], error: null });
    // Push subscriptions for target user
    const subsChain = createChainMock({
      data: [{ id: 'sub-1', endpoint: 'https://push.example.com/sub1', p256dh: 'key', auth: 'auth', is_active: true, user_id: TARGET_USER_ID }],
      error: null,
    });

    const fromMock = vi.fn()
      .mockReturnValueOnce(callerSpacesChain)
      .mockReturnValueOnce(targetSpacesChain)
      .mockReturnValueOnce(subsChain);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: fromMock,
    } as any);

    vi.mocked(webpush.sendNotification).mockResolvedValue(undefined as any);

    const request = new NextRequest('http://localhost/api/notifications/send-push', {
      method: 'POST',
      body: JSON.stringify({ userId: TARGET_USER_ID, payload: validPayload }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBe(1);
  });
});
