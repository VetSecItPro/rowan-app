/**
 * Unit tests for lib/hooks/useCalendarData.ts
 *
 * Tests initial state, view mode switching, search state, and helper functions.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendarData } from '@/lib/hooks/useCalendarData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/hooks/useCalendarRealtime', () => ({
  useCalendarRealtime: vi.fn(() => ({
    events: [],
    presence: {},
    isConnected: false,
    broadcastEditing: vi.fn(),
    broadcastViewing: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useUnifiedCalendar', () => ({
  useUnifiedCalendar: vi.fn(() => ({
    items: [],
    itemsByDate: new Map(),
    counts: { event: 0, task: 0, meal: 0, reminder: 0, goal: 0 },
    isLoading: false,
    error: null,
    filters: {
      showEvents: true,
      showTasks: true,
      showMeals: true,
      showReminders: true,
      showGoals: true,
    },
    setFilters: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/contexts/subscription-context', () => ({
  useFeatureAccessSafe: vi.fn(() => ({
    hasAccess: true,
    requestUpgrade: vi.fn(),
  })),
}));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
  })),
}));

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    getEvents: vi.fn().mockResolvedValue([]),
    getCalendarConnections: vi.fn().mockResolvedValue([]),
  },
  CalendarEvent: {},
}));

vi.mock('@/lib/services/shopping-integration-service', () => ({
  shoppingIntegrationService: {
    getLinkedShoppingLists: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/services/geolocation-service', () => ({
  geolocationService: {
    geocodeAddress: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return { ...actual };
});

vi.mock('zod', async (importOriginal) => {
  return await importOriginal();
});

vi.mock('@/lib/types/unified-calendar-item', () => ({
  DEFAULT_UNIFIED_FILTERS: {
    showEvents: true,
    showTasks: true,
    showMeals: true,
    showReminders: true,
    showGoals: true,
  },
}));

// Mock localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useCalendarData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should return initial state with empty events', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toEqual([]);
    expect(result.current.viewMode).toBe('month');
    expect(result.current.searchQuery).toBe('');
  });

  it('setViewMode should update the view mode', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setViewMode('week'));

    expect(result.current.viewMode).toBe('week');
  });

  it('setSearchQuery should update search state', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('meeting'));

    expect(result.current.searchQuery).toBe('meeting');
  });

  it('should expose getEventsForDate as a function', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.getEventsForDate).toBe('function');
    const events = result.current.getEventsForDate(new Date());
    expect(Array.isArray(events)).toBe(true);
  });

  it('should expose calendarDays as an array', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.calendarDays)).toBe(true);
  });

  it('should expose getCategoryColor function', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.getCategoryColor).toBe('function');
    const color = result.current.getCategoryColor('work');
    expect(color).toBeDefined();
    expect(typeof color.bg).toBe('string');
  });

  it('should expose loadEvents function', async () => {
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.loadEvents).toBe('function');
  });
});
