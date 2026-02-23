/**
 * Unit tests for lib/hooks/useTasksData.ts
 *
 * Tests initial state, search/filter state, and pagination helpers.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasksData } from '@/lib/hooks/useTasksData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/hooks/useTaskRealtime', () => ({
  useTaskRealtime: vi.fn(() => ({
    tasks: [],
    loading: false,
    error: null,
    refreshTasks: vi.fn(),
    setTasks: vi.fn(),
  })),
}));

vi.mock('@/hooks/useChoreRealtime', () => ({
  useChoreRealtime: vi.fn(() => ({
    chores: [],
    loading: false,
    error: null,
    refreshChores: vi.fn(),
    setChores: vi.fn(),
  })),
}));

vi.mock('@/lib/services/shopping-integration-service', () => ({
  shoppingIntegrationService: {
    getShoppingListsForTasks: vi.fn().mockResolvedValue(new Map()),
  },
}));

vi.mock('@/components/tasks/TaskFilterPanel', () => ({
  TaskFilters: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useTasksData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state with empty data', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toEqual([]);
    expect(result.current.chores).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
  });

  it('setSearchQuery should update search state', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('laundry'));

    expect(result.current.searchQuery).toBe('laundry');
  });

  it('setStatusFilter should update status filter', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatusFilter('completed'));

    expect(result.current.statusFilter).toBe('completed');
  });

  it('should expose allItems as combined tasks+chores array', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.allItems)).toBe(true);
  });

  it('should expose stats object with numeric counts', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.stats.total).toBe('number');
    expect(typeof result.current.stats.pending).toBe('number');
    expect(typeof result.current.stats.completed).toBe('number');
  });

  it('should expose handleLoadMore function', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.handleLoadMore).toBe('function');
  });

  it('should expose loadData function', async () => {
    const { result } = renderHook(() => useTasksData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.loadData).toBe('function');
  });
});
