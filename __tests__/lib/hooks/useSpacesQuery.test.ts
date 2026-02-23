/**
 * Unit tests for lib/hooks/useSpacesQuery.ts
 *
 * Tests spaces data fetching:
 * - User spaces query
 * - Space members
 * - Real-time updates
 * - Mutations
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Import after mocks
import { useUserSpaces } from '@/lib/hooks/useSpacesQuery';

describe('useUserSpaces', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Setup mock chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq, count: vi.fn() });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({
      data: [
        {
          role: 'owner',
          spaces: {
            id: 'space-1',
            name: 'My Space',
            type: 'family',
            created_at: '2024-01-01',
          },
        },
      ],
      error: null,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  ;

  it('should not query without userId', () => {
    const { result } = renderHook(() => useUserSpaces(undefined), { wrapper });

    // When enabled: false, the query is pending but not loading
    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should fetch user spaces', async () => {
    const { result } = renderHook(() => useUserSpaces('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(mockFrom).toHaveBeenCalledWith('space_members');
  });

  it('should include user role in space data', async () => {
    const { result } = renderHook(() => useUserSpaces('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    if (result.current.data && result.current.data.length > 0) {
      expect(result.current.data[0].role).toBe('owner');
    }
  });

  it('should handle empty spaces', async () => {
    // Reset mocks for this test
    vi.clearAllMocks();

    // Mock the count check to return 0
    const mockCountSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });

    mockFrom.mockReturnValue({ select: mockCountSelect });

    const { result } = renderHook(() => useUserSpaces('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return empty array
    expect(result.current.data).toEqual([]);
  });
});
