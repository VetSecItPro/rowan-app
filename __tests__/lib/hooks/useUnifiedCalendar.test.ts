/**
 * Unit tests for lib/hooks/useUnifiedCalendar.ts
 *
 * Tests unified calendar data fetching, filter management,
 * localStorage persistence, and refresh functionality.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnifiedCalendar } from '@/lib/hooks/useUnifiedCalendar';

const mockGetUnifiedItems = vi.fn();
const mockGroupByDate = vi.fn().mockReturnValue(new Map());

vi.mock('@/lib/services/calendar/unified-calendar-service', () => ({
  unifiedCalendarService: {
    getUnifiedItems: (...args: unknown[]) => mockGetUnifiedItems(...args),
  },
}));

vi.mock('@/lib/services/calendar/unified-calendar-mapper', () => ({
  unifiedCalendarMapper: {
    groupByDate: (...args: unknown[]) => mockGroupByDate(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/types/unified-calendar-item', () => ({
  DEFAULT_UNIFIED_FILTERS: {
    showEvents: true,
    showTasks: true,
    showMeals: true,
    showReminders: true,
    showGoals: true,
  },
}));

const defaultOptions = {
  spaceId: 'space-1',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
};

describe('useUnifiedCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage since Node's built-in localStorage lacks clear()
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      key: vi.fn(),
      length: 0,
    });
    mockGetUnifiedItems.mockResolvedValue({
      items: [],
      counts: { event: 0, task: 0, meal: 0, reminder: 0, goal: 0 },
      errors: [],
    });
  });

  it('should return initial loading state then settle', async () => {
    const { result } = renderHook(() => useUnifiedCalendar(defaultOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should call unifiedCalendarService.getUnifiedItems with correct params', async () => {
    const { result } = renderHook(() => useUnifiedCalendar(defaultOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetUnifiedItems).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'space-1',
        startDate: defaultOptions.startDate,
        endDate: defaultOptions.endDate,
      })
    );
  });

  it('should expose a setFilters function that updates filter state', async () => {
    const { result } = renderHook(() => useUnifiedCalendar({ ...defaultOptions, persistFilters: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({
        showEvents: false,
        showTasks: true,
        showMeals: true,
        showReminders: true,
        showGoals: true,
      });
    });

    expect(result.current.filters.showEvents).toBe(false);
  });

  it('should expose a refresh function', async () => {
    const { result } = renderHook(() => useUnifiedCalendar(defaultOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should set error when service throws', async () => {
    mockGetUnifiedItems.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useUnifiedCalendar(defaultOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });

  it('should not fetch when autoFetch is false', () => {
    renderHook(() => useUnifiedCalendar({ ...defaultOptions, autoFetch: false }));

    expect(mockGetUnifiedItems).not.toHaveBeenCalled();
  });

  it('should persist filters to localStorage when persistFilters is true', async () => {
    const { result } = renderHook(() =>
      useUnifiedCalendar({ ...defaultOptions, persistFilters: true })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({
        showEvents: false,
        showTasks: true,
        showMeals: true,
        showReminders: true,
        showGoals: true,
      });
    });

    const stored = localStorage.getItem('rowan-calendar-filters');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.showEvents).toBe(false);
  });

  it('should populate items from service response', async () => {
    const mockItems = [
      { id: 'event-1', title: 'Meeting', type: 'event' },
    ];
    mockGetUnifiedItems.mockResolvedValueOnce({
      items: mockItems,
      counts: { event: 1, task: 0, meal: 0, reminder: 0, goal: 0 },
      errors: [],
    });

    const { result } = renderHook(() => useUnifiedCalendar(defaultOptions));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(mockItems);
    expect(result.current.counts.event).toBe(1);
  });
});
