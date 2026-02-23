/**
 * Unit tests for lib/hooks/useGoalsData.ts
 *
 * Tests initial state, view mode switching, and search/filter state.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGoalsData } from '@/lib/hooks/useGoalsData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/hooks/useFeatureGate', () => ({
  useFeatureGate: vi.fn(() => ({
    hasAccess: true,
    isLoading: false,
  })),
}));

vi.mock('@/lib/hooks/usePresence', () => ({
  usePresence: vi.fn(() => ({
    members: [],
    onlineCount: 0,
    isLoading: false,
    error: null,
    refreshPresence: vi.fn(),
  })),
}));

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoals: vi.fn().mockResolvedValue([]),
    getMilestones: vi.fn().mockResolvedValue([]),
    getSpaceMembers: vi.fn().mockResolvedValue([]),
  },
  Goal: {},
  Milestone: {},
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useGoalsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state with empty data', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.goals).toEqual([]);
    expect(result.current.milestones).toEqual([]);
    expect(result.current.viewMode).toBe('goals');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
  });

  it('setViewMode should update the view mode', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setViewMode('milestones'));

    expect(result.current.viewMode).toBe('milestones');
  });

  it('setSearchQuery should update the search query', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('fitness'));

    expect(result.current.searchQuery).toBe('fitness');
  });

  it('should expose filteredGoals and filteredMilestones', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.filteredGoals)).toBe(true);
    expect(Array.isArray(result.current.filteredMilestones)).toBe(true);
  });

  it('should expose stats object', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.active).toBe('number');
    expect(typeof result.current.stats.completed).toBe('number');
  });

  it('setFocusMode should toggle focus mode', async () => {
    const { result } = renderHook(() => useGoalsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFocusMode(true));

    expect(result.current.focusMode).toBe(true);
  });
});
