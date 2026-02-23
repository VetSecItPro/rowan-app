import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/location/emergency/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/push-notification-service', () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/services/subscription-service', () => ({
  getUserTier: vi.fn(),
}));

vi.mock('@/lib/config/feature-limits', () => ({
  getFeatureLimits: vi.fn(),
}));

vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(
    () => new Response(JSON.stringify({ error: 'Upgrade required' }), { status: 402 })
  ),
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

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeSupabaseMock({
  insertError = null,
  members = [{ user_id: 'member-1' }],
  profileName = 'Jane',
}: {
  insertError?: unknown;
  members?: { user_id: string }[];
  profileName?: string | null;
} = {}) {
  const fromMap: Record<string, unknown> = {};

  const insertMock = vi.fn().mockResolvedValue({ error: insertError });

  const membersChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({ data: members, error: null }),
  };

  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { name: profileName }, error: null }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_locations') return { insert: insertMock };
      if (table === 'space_members') return membersChain;
      if (table === 'users') return profileChain;
      return fromMap[table] ?? {};
    }),
  };
}

async function setupPremiumAuth(supabaseMockOverride?: ReturnType<typeof makeSupabaseMock>) {
  const { createClient } = await import('@/lib/supabase/server');
  const { getUserTier } = await import('@/lib/services/subscription-service');
  const { getFeatureLimits } = await import('@/lib/config/feature-limits');
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

  vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
  vi.mocked(createClient).mockResolvedValue(
    (supabaseMockOverride ?? makeSupabaseMock()) as never
  );
  vi.mocked(getUserTier).mockResolvedValue('premium');
  vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: true } as never);
}

const validBody = {
  space_id: SPACE_ID,
  latitude: 32.77,
  longitude: -96.79,
};

describe('/api/location/emergency POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
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
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 402 when user tier does not support location', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserTier } = await import('@/lib/services/subscription-service');
    const { getFeatureLimits } = await import('@/lib/config/feature-limits');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    } as never);
    vi.mocked(getUserTier).mockResolvedValue('free');
    vi.mocked(getFeatureLimits).mockReturnValue({ canUseLocation: false } as never);

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);

    expect(response.status).toBe(402);
  });

  it('should return 400 for invalid Zod request body', async () => {
    await setupPremiumAuth();

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify({
        space_id: 'not-a-uuid',
        latitude: 999, // out of range
        longitude: -96.79,
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(data.details).toBeDefined();
  });

  it('should return 403 when user lacks space access', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    await setupPremiumAuth();
    vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('No access'));

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('do not have access');
  });

  it('should send emergency alert successfully and notify family members', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const { sendPushNotification } = await import(
      '@/lib/services/push-notification-service'
    );
    const supabaseMock = makeSupabaseMock({
      members: [{ user_id: 'member-1' }, { user_id: 'member-2' }],
      profileName: 'Jane',
    });
    await setupPremiumAuth(supabaseMock);
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
    vi.mocked(sendPushNotification).mockResolvedValue({ sent: 2 } as never);

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify({
        ...validBody,
        message: 'Help needed!',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.notified).toBe(2);
    expect(data.message).toContain('family members');
    expect(sendPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['member-1', 'member-2'],
        notification: expect.objectContaining({
          title: 'Emergency Alert',
        }),
      })
    );
  });

  it('should return success with notified=0 when no other members in space', async () => {
    const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
    const supabaseMock = makeSupabaseMock({ members: [] });
    await setupPremiumAuth(supabaseMock);
    vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/location/emergency', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.notified).toBe(0);
    expect(data.message).toContain('no other family members');
  });
});
