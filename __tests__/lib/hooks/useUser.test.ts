/**
 * Unit tests for lib/hooks/useUser.ts
 *
 * Tests auth user subscription:
 * - Initial user fetch
 * - Auth state change subscription
 * - Cleanup on unmount
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '@/lib/hooks/useUser';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase client
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('useUser', () => {
  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockSession: Partial<Session> = {
    user: mockUser as User,
    access_token: 'token-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return loading state initially', () => {
    mockGetUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useUser());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('should fetch and return authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('should return null user when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(null);
  });

  it('should subscribe to auth state changes', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    renderHook(() => useUser());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    });

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update user on auth state change', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    let authCallback: (event: string, session: Session | null) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(null);

    // Simulate sign in
    authCallback('SIGNED_IN', mockSession as Session);

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('should set user to null on sign out', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    let authCallback: (event: string, session: Session | null) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Simulate sign out
    authCallback('SIGNED_OUT', null);

    await waitFor(() => {
      expect(result.current.user).toBe(null);
    });
  });

  it('should cleanup subscription on unmount', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { unmount } = renderHook(() => useUser());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle getUser errors gracefully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error', status: 401 },
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not crash, just show no user
    expect(result.current.user).toBe(null);
  });
});
