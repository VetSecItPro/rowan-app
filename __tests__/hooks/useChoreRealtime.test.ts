/**
 * Unit tests for hooks/useChoreRealtime.ts
 *
 * Tests Supabase channel setup, initial state, empty spaceId guard, and cleanup.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChoreRealtime } from '@/hooks/useChoreRealtime';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildChannelMock() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
}

describe('useChoreRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: user has access
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // space_members membership check
    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: 'user-1', role: 'member' }, error: null }),
    };

    // chores data query
    const choresQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      error: null,
    };
    choresQuery.order = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'space_members') return membershipQuery;
      return choresQuery;
    });

    mockChannel.mockReturnValue(buildChannelMock());
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() =>
      useChoreRealtime({ spaceId: 'space-1' })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.chores).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty chores and not loading when spaceId is empty', async () => {
    const { result } = renderHook(() =>
      useChoreRealtime({ spaceId: '' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.chores).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should create a channel with the space-scoped name', () => {
    renderHook(() => useChoreRealtime({ spaceId: 'space-1' }));

    expect(mockChannel).toHaveBeenCalledWith('chores:space-1');
  });

  it('should expose refreshChores function', () => {
    const { result } = renderHook(() =>
      useChoreRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.refreshChores).toBe('function');
  });

  it('should expose setChores function for optimistic updates', () => {
    const { result } = renderHook(() =>
      useChoreRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.setChores).toBe('function');
  });

  it('should call removeChannel on unmount', () => {
    const { unmount } = renderHook(() =>
      useChoreRealtime({ spaceId: 'space-1' })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('should set error when user does not have access to space', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };
    mockFrom.mockReturnValue(membershipQuery);

    const { result } = renderHook(() =>
      useChoreRealtime({ spaceId: 'space-1' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
