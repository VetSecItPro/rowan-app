/**
 * Unit tests for lib/hooks/usePresence.ts
 *
 * Tests real-time presence tracking:
 * - Channel subscription
 * - Presence state sync
 * - User join/leave events
 * - Viewing goal updates
 * - Cleanup on unmount
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePresence, type PresenceUser } from '@/lib/hooks/usePresence';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Supabase client
const mockTrack = vi.fn();
const mockUntrack = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockRemoveChannel = vi.fn();
const mockPresenceState = vi.fn();

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  track: mockTrack,
  untrack: mockUntrack,
  presenceState: mockPresenceState,
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('usePresence', () => {
  const defaultOptions = {
    channelName: 'test-presence',
    spaceId: 'space-123',
    userId: 'user-123',
    userEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel); // Chain on() calls
    mockSubscribe.mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return mockChannel;
    });
    mockPresenceState.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not subscribe when spaceId is missing', () => {
    renderHook(() =>
      usePresence({
        ...defaultOptions,
        spaceId: '',
      })
    );

    expect(mockOn).not.toHaveBeenCalled();
  });

  it('should not subscribe when userId is missing', () => {
    renderHook(() =>
      usePresence({
        ...defaultOptions,
        userId: '',
      })
    );

    expect(mockOn).not.toHaveBeenCalled();
  });

  it('should subscribe to presence channel', () => {
    renderHook(() => usePresence(defaultOptions));

    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should track presence on subscribe', async () => {
    renderHook(() => usePresence(defaultOptions));

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith({
        user_id: 'user-123',
        user_email: 'test@example.com',
        online_at: expect.any(String),
      });
    });
  });

  it('should update presence state on sync', () => {
    let syncCallback: (() => void) | null = null;

    mockOn.mockImplementation((type, event, callback) => {
      if (event.event === 'sync') {
        syncCallback = callback;
      }
      return mockChannel;
    });

    const mockState = {
      'user-456': [
        {
          user_id: 'user-456',
          user_email: 'other@example.com',
          online_at: '2024-01-01T00:00:00Z',
        } as PresenceUser,
      ],
    };

    mockPresenceState.mockReturnValue(mockState);

    const { result } = renderHook(() => usePresence(defaultOptions));

    act(() => {
      syncCallback?.();
    });

    expect(result.current.presenceState).toEqual(mockState);
  });

  it('should filter out current user from onlineUsers', () => {
    let syncCallback: (() => void) | null = null;

    mockOn.mockImplementation((type, event, callback) => {
      if (event.event === 'sync') {
        syncCallback = callback;
      }
      return mockChannel;
    });

    const mockState = {
      'user-123': [
        {
          user_id: 'user-123',
          user_email: 'test@example.com',
          online_at: '2024-01-01T00:00:00Z',
        } as PresenceUser,
      ],
      'user-456': [
        {
          user_id: 'user-456',
          user_email: 'other@example.com',
          online_at: '2024-01-01T00:00:00Z',
        } as PresenceUser,
      ],
    };

    mockPresenceState.mockReturnValue(mockState);

    const { result } = renderHook(() => usePresence(defaultOptions));

    act(() => {
      syncCallback?.();
    });

    expect(result.current.onlineUsers).toHaveLength(1);
    expect(result.current.onlineUsers[0].user_id).toBe('user-456');
  });

  it('should update viewing goal', async () => {
    const { result } = renderHook(() => usePresence(defaultOptions));

    await act(async () => {
      await result.current.updateViewingGoal('goal-789');
    });

    expect(mockTrack).toHaveBeenCalledWith({
      user_id: 'user-123',
      user_email: 'test@example.com',
      viewing_goal: 'goal-789',
      online_at: expect.any(String),
    });
  });

  it('should clear viewing goal when null', async () => {
    const { result } = renderHook(() => usePresence(defaultOptions));

    await act(async () => {
      await result.current.updateViewingGoal(null);
    });

    expect(mockTrack).toHaveBeenCalledWith({
      user_id: 'user-123',
      user_email: 'test@example.com',
      viewing_goal: undefined,
      online_at: expect.any(String),
    });
  });

  it('should get users viewing specific goal', () => {
    let syncCallback: (() => void) | null = null;

    mockOn.mockImplementation((type, event, callback) => {
      if (event.event === 'sync') {
        syncCallback = callback;
      }
      return mockChannel;
    });

    const mockState = {
      'user-456': [
        {
          user_id: 'user-456',
          user_email: 'user1@example.com',
          viewing_goal: 'goal-1',
          online_at: '2024-01-01T00:00:00Z',
        } as PresenceUser,
      ],
      'user-789': [
        {
          user_id: 'user-789',
          user_email: 'user2@example.com',
          viewing_goal: 'goal-2',
          online_at: '2024-01-01T00:00:00Z',
        } as PresenceUser,
      ],
    };

    mockPresenceState.mockReturnValue(mockState);

    const { result } = renderHook(() => usePresence(defaultOptions));

    act(() => {
      syncCallback?.();
    });

    const viewingGoal1 = result.current.getUsersViewingGoal('goal-1');
    expect(viewingGoal1).toHaveLength(1);
    expect(viewingGoal1[0].user_id).toBe('user-456');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePresence(defaultOptions));

    unmount();

    expect(mockUntrack).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
