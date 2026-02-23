import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-key';
});

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/privacy/emails/deletion-confirmation/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ data: {}, error: null });
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

vi.mock('@/lib/ratelimit', () => ({
  checkSensitiveOperationRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn(() => 'http://localhost:3000'),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const FUTURE_DATE = new Date(Date.now() + 30 * 86400000).toISOString();

describe('/api/privacy/emails/deletion-confirmation POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('should return 429 when rate limited', async () => {
    const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      body: JSON.stringify({ userId: USER_ID, deletionDate: FUTURE_DATE }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
  });

  it('should return 400 for invalid request body', async () => {
    const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);

    const request = new NextRequest('http://localhost/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      body: JSON.stringify({ userId: 'bad-uuid', deletionDate: FUTURE_DATE }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should return 400 for invalid deletionDate', async () => {
    const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: { id: USER_ID } }, error: null } as never);
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { email: 'a@b.com', full_name: 'Test' }, error: null }),
    } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ userId: USER_ID, deletionDate: 'not-a-date' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid deletionDate');
  });

  it('should return 401 when authenticated user id does not match body userId', async () => {
    const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: null }, error: {} } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      body: JSON.stringify({ userId: USER_ID, deletionDate: FUTURE_DATE }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should send deletion confirmation email and return success', async () => {
    const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({ data: { user: { id: USER_ID } }, error: null } as never);
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { email: 'user@example.com', full_name: 'Test User' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null })),
    } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ userId: USER_ID, deletionDate: FUTURE_DATE }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
