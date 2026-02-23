import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/notifications/track-dismissal/route';

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
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOTIF_ID = '00000000-0000-4000-8000-000000000050';

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.insert = vi.fn(handler);
  mock.update = vi.fn(handler);
  mock.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  return mock;
}

describe('/api/notifications/track-dismissal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/notifications/track-dismissal', {
      method: 'POST',
      body: JSON.stringify({ action: 'dismissed' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return 400 for invalid action value', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/notifications/track-dismissal', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid_action' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return success=true with tracked=false when user is unauthenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/track-dismissal', {
      method: 'POST',
      body: JSON.stringify({ action: 'dismissed', notification_id: NOTIF_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Graceful degradation — no auth required for service worker dismissal tracking
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(false);
  });

  it('should track dismissal successfully when authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const insertChain = createChainMock({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => insertChain),
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/track-dismissal', {
      method: 'POST',
      body: JSON.stringify({ action: 'dismissed', notification_id: NOTIF_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(true);
  });

  it('should mark notification as read when action is clicked', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
    });

    const insertChain = createChainMock({ error: null });
    const updateChain = createChainMock({ error: null });
    const fromMock = vi.fn().mockReturnValueOnce(insertChain).mockReturnValue(updateChain);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: fromMock,
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/track-dismissal', {
      method: 'POST',
      body: JSON.stringify({ action: 'clicked', notification_id: NOTIF_ID }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(true);
  });
});
