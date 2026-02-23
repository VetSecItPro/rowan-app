/**
 * Unit tests for lib/hooks/useCalendarRealtime.ts
 *
 * Tests Supabase realtime channel setup, initial state, and cleanup.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarRealtime } from '@/lib/hooks/useCalendarRealtime';

const mockUnsubscribe = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockTrack = vi.fn();
const mockSend = vi.fn();
const mockPresenceState = vi.fn().mockReturnValue({});
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildChannelMock() {
  const channelObj = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: mockUnsubscribe,
    track: mockTrack,
    send: mockSend,
    presenceState: mockPresenceState,
  };
  return channelObj;
}

describe('useCalendarRealtime', () => {
  let channelMock: ReturnType<typeof buildChannelMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    channelMock = buildChannelMock();
    mockChannel.mockReturnValue(channelMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state with empty events and presence', () => {
    const { result } = renderHook(() =>
      useCalendarRealtime('space-1', 'user-1')
    );

    expect(result.current.events).toEqual([]);
    expect(result.current.presence).toEqual({});
    expect(result.current.isConnected).toBe(false);
  });

  it('should expose broadcastEditing and broadcastViewing functions', () => {
    const { result } = renderHook(() =>
      useCalendarRealtime('space-1', 'user-1')
    );

    expect(typeof result.current.broadcastEditing).toBe('function');
    expect(typeof result.current.broadcastViewing).toBe('function');
  });

  it('should subscribe to channel when spaceId and userId are provided', () => {
    renderHook(() => useCalendarRealtime('space-1', 'user-1'));

    expect(mockChannel).toHaveBeenCalledWith('calendar:space-1');
    expect(channelMock.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should not subscribe when spaceId is undefined', () => {
    renderHook(() => useCalendarRealtime(undefined, 'user-1'));

    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('should not subscribe when userId is undefined', () => {
    renderHook(() => useCalendarRealtime('space-1', undefined));

    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('should call unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useCalendarRealtime('space-1', 'user-1')
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('broadcastEditing should not throw when channelRef is null', () => {
    const { result } = renderHook(() =>
      useCalendarRealtime(undefined, undefined)
    );

    expect(() => act(() => result.current.broadcastEditing('event-1'))).not.toThrow();
  });

  it('broadcastViewing should not throw when channelRef is null', () => {
    const { result } = renderHook(() =>
      useCalendarRealtime(undefined, undefined)
    );

    expect(() => act(() => result.current.broadcastViewing('event-1'))).not.toThrow();
  });
});
