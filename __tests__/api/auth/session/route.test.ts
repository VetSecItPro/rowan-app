import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/session/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('/api/auth/session GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 + user info when getUser() resolves with a user', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@rowan-test.app' } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      authenticated: true,
      user: { id: 'user-123', email: 'test@rowan-test.app' },
    });
  });

  it('returns 401 when getUser() returns no user (no session cookie)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.authenticated).toBe(false);
  });

  it('returns 401 when getUser() returns an error (invalid JWT)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid JWT', name: 'AuthError' },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.authenticated).toBe(false);
  });

  it('does NOT leak sensitive user fields (only id + email)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@rowan-test.app',
              aud: 'authenticated',
              role: 'authenticated',
              created_at: '2026-01-01',
              email_confirmed_at: '2026-01-01',
              user_metadata: { secret_setting: 'leak-me' },
              app_metadata: { provider: 'email' },
            },
          },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const response = await GET();
    const body = await response.json();

    expect(body.user).toEqual({ id: 'user-123', email: 'test@rowan-test.app' });
    expect(body.user).not.toHaveProperty('user_metadata');
    expect(body.user).not.toHaveProperty('app_metadata');
    expect(body.user).not.toHaveProperty('aud');
    expect(body.user).not.toHaveProperty('role');
  });
});
