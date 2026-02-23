import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// RESEND_API_KEY must be set before route module loads (resend is initialized at import time)
const { mockSendEmail } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-key';
  return { mockSendEmail: vi.fn() };
});

import { POST } from '@/app/api/notifications/email/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSendEmail };
    },
  };
});

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
const RECIPIENT_ID = '00000000-0000-4000-8000-000000000002';

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.maybeSingle = vi.fn(handler);
  mock.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  return mock;
}

const validBody = {
  type: 'reminder',
  recipient: 'recipient@example.com',
  subject: 'Test email',
  data: { html: '<p>Hello world</p>' },
};

describe('/api/notifications/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure RESEND_API_KEY is set so `resend` is not null
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('should return 429 when rate limit exceeded', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: false, limit: 10, remaining: 0, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
  });

  it('should return 400 for invalid request body', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      // Missing required fields
      body: JSON.stringify({ type: 'reminder' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { createClient } = await import('@/lib/supabase/server');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    });

    // No Bearer token → falls back to session auth
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when email content is missing', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    });

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'No token' },
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      // data has no html or text
      body: JSON.stringify({ ...validBody, data: {} }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email content missing');
  });

  it('should return 404 when recipient user not found', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    });

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'No token' },
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    } as any);

    const notFoundChain = createChainMock({ data: null, error: { message: 'not found' } });
    vi.mocked(supabaseAdmin.from).mockReturnValue(notFoundChain as any);

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Recipient not found');
  });

  it('should send email successfully when caller and recipient share a space', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({
      success: true, limit: 10, remaining: 9, reset: Date.now() + 60000,
    });

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'No token' },
    } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    } as any);

    const SPACE_ID = '00000000-0000-4000-8000-000000000002';

    // First call: lookup recipient user row
    // Subsequent calls: space membership checks for canNotifyUser
    const recipientChain = createChainMock({ data: { id: RECIPIENT_ID, email: 'recipient@example.com' }, error: null });
    const callerSpacesChain = createChainMock({ data: [{ space_id: SPACE_ID }], error: null });
    const recipientSpacesChain = createChainMock({ data: [{ space_id: SPACE_ID }], error: null });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(recipientChain as any)
      .mockReturnValueOnce(callerSpacesChain as any)
      .mockReturnValueOnce(recipientSpacesChain as any);

    mockSendEmail.mockResolvedValue({ error: null });

    const request = new NextRequest('http://localhost/api/notifications/email', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
