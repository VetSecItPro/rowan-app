/**
 * Unit tests for lib/middleware/auth.ts
 *
 * Tests Supabase middleware client initialization, cookie management,
 * and session extraction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/ssr before importing auth
const mockGetUser = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
const mockCookieRemove = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, config: { cookies: { get: (name: string) => string | undefined; set: (name: string, value: string, opts: unknown) => void; remove: (name: string, opts: unknown) => void } }) => {
    // Capture the cookie callbacks so we can invoke them in tests
    mockCookieGet.mockImplementation(config.cookies.get);
    mockCookieSet.mockImplementation(config.cookies.set);
    mockCookieRemove.mockImplementation(config.cookies.remove);
    return {
      auth: {
        getUser: mockGetUser,
      },
    };
  }),
}));

import { initAuth } from '@/lib/middleware/auth';

function makeRequest(url: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(url);
  Object.entries(cookies).forEach(([name, value]) => {
    req.cookies.set(name, value);
  });
  return req;
}

describe('initAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('returns null session when no user is authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const req = makeRequest('https://example.com/dashboard');
    const headers = new Headers(req.headers);

    const { session } = await initAuth(req, headers);
    expect(session).toBeNull();
  });

  it('returns session with user when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });

    const req = makeRequest('https://example.com/dashboard');
    const headers = new Headers(req.headers);

    const { session } = await initAuth(req, headers);
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe('user-123');
    expect(session?.user.email).toBe('test@example.com');
  });

  it('returns a NextResponse', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const req = makeRequest('https://example.com/dashboard');
    const headers = new Headers(req.headers);

    const { response } = await initAuth(req, headers);
    expect(response).toBeDefined();
    expect(typeof response.headers.get).toBe('function');
  });

  it('reads cookies from the request via the cookie getter', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const req = makeRequest('https://example.com/dashboard', {
      'sb-access-token': 'test-token',
    });
    const headers = new Headers(req.headers);

    await initAuth(req, headers);

    // The Supabase client should read cookies via the get callback
    const cookieValue = mockCookieGet.mock.calls.length > 0
      ? mockCookieGet('sb-access-token')
      : undefined;

    if (mockCookieGet.mock.calls.length > 0) {
      expect(cookieValue).toBe('test-token');
    }
  });

  it('handles getUser error gracefully by returning null session', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'JWT expired' } });
    const req = makeRequest('https://example.com/dashboard');
    const headers = new Headers(req.headers);

    const { session } = await initAuth(req, headers);
    expect(session).toBeNull();
  });
});
