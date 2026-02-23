/**
 * Unit tests for hooks/useAdmin.ts
 *
 * Tests admin status check via supabase RPC is_admin().
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdmin } from '@/hooks/useAdmin';

const mockRpc = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading true initially when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { result } = renderHook(() => useAdmin());

    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should return isAdmin false when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return isAdmin true when RPC returns true', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('is_admin');
  });

  it('should return isAdmin false when RPC returns false', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return isAdmin false when RPC returns an error', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return isAdmin false when RPC throws', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mockRpc.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });
});
