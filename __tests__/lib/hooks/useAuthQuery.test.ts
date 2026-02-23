/**
 * Unit tests for lib/hooks/useAuthQuery.ts
 *
 * Tests auth session management, profile queries, and sign-out mutation.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthSession, useAuth, useSignOut, useAuthStateChange } from '@/lib/hooks/useAuthQuery';

const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    })),
  })),
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_KEYS: {
    auth: {
      session: () => ['auth', 'session'],
      profile: (id: string) => ['auth', 'profile', id],
    },
  },
  QUERY_OPTIONS: {
    auth: { staleTime: 5 * 60 * 1000 },
  },
}));

vi.mock('@/lib/react-query/request-deduplication', () => ({
  deduplicatedRequests: {
    updateProfile: vi.fn((_id: string, fn: () => Promise<unknown>) => fn()),
  },
}));

vi.mock('@/lib/react-query/offline-persistence', () => ({
  clearPersistedCache: vi.fn(),
  clearAllAppStorage: vi.fn(),
  markSigningOut: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('should return loading state initially', () => {
    mockGetSession.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuthSession(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('should return session data after fetch', async () => {
    const mockSession = { user: { id: 'user-1', email: 'test@example.com' }, access_token: 'token' };
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuthSession(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockSession);
  });
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('should return isAuthenticated false when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('should expose a refetch function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useSignOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('should call supabase signOut on mutation', async () => {
    const { result } = renderHook(() => useSignOut(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should throw when supabase signOut fails', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } });

    const { result } = renderHook(() => useSignOut(), { wrapper: createWrapper() });

    await expect(
      act(async () => { await result.current.mutateAsync(); })
    ).rejects.toBeDefined();
  });
});

describe('useAuthStateChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('should return a handler function', () => {
    const { result } = renderHook(() => useAuthStateChange(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe('function');
  });

  it('should handle SIGNED_OUT event without throwing', () => {
    const { result } = renderHook(() => useAuthStateChange(), { wrapper: createWrapper() });
    expect(() => {
      result.current('SIGNED_OUT', null);
    }).not.toThrow();
  });
});
