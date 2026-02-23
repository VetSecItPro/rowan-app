/**
 * Unit tests for hooks/useRemindersRealtime.ts
 *
 * Tests Supabase channel setup, initial state, empty spaceId guard, and cleanup.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRemindersRealtime } from '@/hooks/useRemindersRealtime';

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

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

function buildChannelMock() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
}

describe('useRemindersRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' }, error: null }),
    };

    const remindersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      error: null,
    };
    // Make the final chain resolve
    remindersQuery.in = vi.fn().mockResolvedValue({ data: [], error: null });
    remindersQuery.order = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'space_members') return membershipQuery;
      return remindersQuery;
    });

    mockChannel.mockReturnValue(buildChannelMock());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() =>
      useRemindersRealtime({ spaceId: 'space-1' })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.reminders).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty reminders and stop loading when spaceId is empty', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      useRemindersRealtime({ spaceId: '' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reminders).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should create a channel with the space-scoped name', () => {
    renderHook(() => useRemindersRealtime({ spaceId: 'space-1' }));

    expect(mockChannel).toHaveBeenCalledWith('reminders:space-1');
  });

  it('should expose refreshReminders function', () => {
    const { result } = renderHook(() =>
      useRemindersRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.refreshReminders).toBe('function');
  });

  it('should expose setReminders function for optimistic updates', () => {
    const { result } = renderHook(() =>
      useRemindersRealtime({ spaceId: 'space-1' })
    );

    expect(typeof result.current.setReminders).toBe('function');
  });

  it('should call removeChannel on unmount', () => {
    const { unmount } = renderHook(() =>
      useRemindersRealtime({ spaceId: 'space-1' })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
