/**
 * Unit tests for lib/hooks/useCheckIn.ts
 *
 * Tests initial state, mood selection, and form field updates.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckIn } from '@/lib/hooks/useCheckIn';

const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/services/checkins-service', () => ({
  checkInsService: {
    getCheckIns: vi.fn().mockResolvedValue([]),
    getTodayCheckIn: vi.fn().mockResolvedValue(null),
    getRecentCheckIns: vi.fn().mockResolvedValue([]),
    getCheckInStats: vi.fn().mockResolvedValue(null),
    createCheckIn: vi.fn().mockResolvedValue({ id: 'checkin-1' }),
    subscribeToCheckIns: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  },
}));

vi.mock('@/lib/services/reactions-service', () => ({
  reactionsService: {
    getReactionsForCheckIn: vi.fn().mockResolvedValue([]),
    getReactionsForCheckIns: vi.fn().mockResolvedValue({}),
    addReaction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };
    mockChannel.mockReturnValue(channelMock);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() =>
      useCheckIn({ spaceId: 'space-1', userId: 'user-1' })
    );

    expect(result.current.selectedMood).toBeNull();
    expect(result.current.checkInNote).toBe('');
    expect(result.current.checkInHighlights).toBe('');
    expect(result.current.checkInChallenges).toBe('');
    expect(result.current.checkInGratitude).toBe('');
    expect(result.current.checkInEnergy).toBeNull();
    expect(result.current.checkInExpanded).toBe(false);
    expect(result.current.checkInSaving).toBe(false);
    expect(result.current.viewMode).toBe('checkin');
    expect(result.current.journalView).toBe('list');
    expect(result.current.recentCheckIns).toEqual([]);
    expect(result.current.checkInStats).toBeNull();
    expect(result.current.showCheckInSuccess).toBe(false);
    expect(Array.isArray(result.current.moodOptions)).toBe(true);
    expect(result.current.moodOptions.length).toBeGreaterThan(0);
  });

  it('should return actions object with expected functions', () => {
    const { result } = renderHook(() =>
      useCheckIn({ spaceId: 'space-1', userId: 'user-1' })
    );

    expect(typeof result.current.setSelectedMood).toBe('function');
    expect(typeof result.current.setCheckInNote).toBe('function');
    expect(typeof result.current.handleMoodSelect).toBe('function');
    expect(typeof result.current.handleCheckIn).toBe('function');
    expect(typeof result.current.handleSendReaction).toBe('function');
    expect(typeof result.current.setViewMode).toBe('function');
  });

  it('handleMoodSelect should update selectedMood', () => {
    const { result } = renderHook(() =>
      useCheckIn({ spaceId: 'space-1', userId: 'user-1' })
    );

    act(() => result.current.handleMoodSelect('happy'));

    expect(result.current.selectedMood).toBe('happy');
  });

  it('setCheckInNote should update note', () => {
    const { result } = renderHook(() =>
      useCheckIn({ spaceId: 'space-1', userId: 'user-1' })
    );

    act(() => result.current.setCheckInNote('Great day!'));

    expect(result.current.checkInNote).toBe('Great day!');
  });

  it('setViewMode should switch between checkin and journal', () => {
    const { result } = renderHook(() =>
      useCheckIn({ spaceId: 'space-1', userId: 'user-1' })
    );

    act(() => result.current.setViewMode('journal'));

    expect(result.current.viewMode).toBe('journal');
  });

  it('should not crash when spaceId or userId is undefined', () => {
    expect(() => {
      renderHook(() => useCheckIn({ spaceId: undefined, userId: undefined }));
    }).not.toThrow();
  });
});
