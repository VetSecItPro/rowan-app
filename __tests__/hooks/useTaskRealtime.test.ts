/**
 * Unit tests for hooks/useTaskRealtime.ts
 *
 * Tests Supabase channel setup, initial state, empty spaceId guard, and cleanup.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';

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

describe('useTaskRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' }, error: null }),
    };

    const tasksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockReturnThis(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'space_members') return membershipQuery;
      return tasksQuery;
    });

    mockChannel.mockReturnValue(buildChannelMock());
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() =>
      useTaskRealtime({ spaceId: 'space-1' })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty tasks and stop loading when spaceId is empty', async () => {
    const { result } = renderHook(() =>
      useTaskRealtime({ spaceId: '' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should create a channel with the space-scoped name', () => {
    renderHook(() => useTaskRealtime({ spaceId: 'space-1' }));

    expect(mockChannel).toHaveBeenCalledWith('tasks:space-1');
  });

  it('should expose refreshTasks function', () => {
    const { result } = renderHook(() =>
      useTaskRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.refreshTasks).toBe('function');
  });

  it('should expose setTasks function for optimistic updates', () => {
    const { result } = renderHook(() =>
      useTaskRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.setTasks).toBe('function');
  });

  it('should call removeChannel on unmount', () => {
    const { unmount } = renderHook(() =>
      useTaskRealtime({ spaceId: 'space-1' })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('should set error when user lacks access to space', async () => {
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
      useTaskRealtime({ spaceId: 'space-1' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
