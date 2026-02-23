import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/user/sessions/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/session-tracking-service', () => ({
  getUserSessions: vi.fn(),
  formatLastActive: vi.fn((v: string) => v),
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

describe('/api/user/sessions GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new Request('http://localhost/api/user/sessions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
    } as never);

    const request = new Request('http://localhost/api/user/sessions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return sessions list successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserSessions } = await import('@/lib/services/session-tracking-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserSessions).mockResolvedValue({
      success: true,
      sessions: [
        {
          id: 'sess-1',
          device_name: 'iPhone 15',
          os: 'iOS',
          browser: 'Safari',
          city: 'Dallas',
          region: 'Texas',
          country: 'US',
          last_active: '2026-02-01T00:00:00.000Z',
          is_current: true,
          created_at: '2026-01-01T00:00:00.000Z',
          ip_address: '1.2.3.4',
        },
      ],
    });

    const request = new Request('http://localhost/api/user/sessions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].device).toBe('iPhone 15');
  });

  it('should return 500 when getUserSessions fails', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { getUserSessions } = await import('@/lib/services/session-tracking-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(getUserSessions).mockResolvedValue({
      success: false,
      error: 'Database error',
    });

    const request = new Request('http://localhost/api/user/sessions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
