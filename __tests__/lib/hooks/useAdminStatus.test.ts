/**
 * Unit tests for lib/hooks/useAdminStatus.ts
 *
 * Tests admin status checking:
 * - RPC call to is_admin function
 * - Caching and stale time
 * - Error handling
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminStatus } from '@/lib/hooks/useAdminStatus';
import React from 'react';

// Mock Supabase client
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

describe('useAdminStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  ;

  it('should not run query when userId is undefined', () => {
    renderHook(() => useAdminStatus(undefined), { wrapper });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should return true for admin users', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAdminStatus('admin-user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('is_admin');
  });

  it('should return false for non-admin users', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => useAdminStatus('regular-user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('should return false on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

    const { result } = renderHook(() => useAdminStatus('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('should show loading state initially', () => {
    mockRpc.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAdminStatus('user-123'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should cache result for 5 minutes', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result, rerender } = renderHook(() => useAdminStatus('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);

    // Rerender should use cached data
    rerender();

    expect(mockRpc).toHaveBeenCalledTimes(1); // Still just once
    expect(result.current.data).toBe(true);
  });
});
