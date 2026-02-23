/**
 * Unit tests for lib/hooks/useCalendarHandlers.ts
 *
 * Tests CRUD event handlers and navigation helpers.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarHandlers } from '@/lib/hooks/useCalendarHandlers';
import type { CalendarHandlersDeps } from '@/lib/hooks/useCalendarHandlers';

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    createEvent: vi.fn().mockResolvedValue({ id: 'new-event', title: 'Test' }),
    updateEvent: vi.fn().mockResolvedValue(undefined),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    updateEventStatus: vi.fn().mockResolvedValue(undefined),
    createEventFromTemplate: vi.fn().mockResolvedValue({ id: 'tpl-event', title: 'Tpl' }),
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
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

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, events_synced: 2 }),
  }),
}));

function buildDeps(overrides: Partial<CalendarHandlersDeps> = {}): CalendarHandlersDeps {
  return {
    events: [],
    setEvents: vi.fn(),
    loadEvents: vi.fn().mockResolvedValue(undefined),
    syncState: {
      isSyncing: false,
      hasCalendarConnection: false,
      calendarConnections: [],
      lastSyncTime: null,
      connectionChecked: false,
      syncTooltipVisible: false,
      setSyncTooltipVisible: vi.fn(),
    },
    setEditingEvent: vi.fn(),
    setIsModalOpen: vi.fn(),
    setDetailEvent: vi.fn(),
    setConfirmDialog: vi.fn(),
    setSelectedUnifiedItem: vi.fn(),
    setIsPreviewModalOpen: vi.fn(),
    editingEvent: null,
    confirmDialog: { isOpen: false, eventId: '' },
    setCurrentMonth: vi.fn(),
    setViewMode: vi.fn(),
    ...overrides,
  };
}

describe('useCalendarHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useCalendarHandlers(buildDeps()));

    expect(typeof result.current.handleCreateEvent).toBe('function');
    expect(typeof result.current.handleDeleteEvent).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
    expect(typeof result.current.handleStatusChange).toBe('function');
    expect(typeof result.current.handleEditEvent).toBe('function');
    expect(typeof result.current.handleCloseModal).toBe('function');
    expect(typeof result.current.handlePrevMonth).toBe('function');
    expect(typeof result.current.handleNextMonth).toBe('function');
    expect(typeof result.current.handleJumpToToday).toBe('function');
  });

  it('handleDeleteEvent should open confirm dialog', () => {
    const setConfirmDialog = vi.fn();
    const deps = buildDeps({ setConfirmDialog });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    act(() => result.current.handleDeleteEvent('event-123'));

    expect(setConfirmDialog).toHaveBeenCalledWith({ isOpen: true, eventId: 'event-123' });
  });

  it('handleEditEvent should set editing event and open modal', () => {
    const setEditingEvent = vi.fn();
    const setIsModalOpen = vi.fn();
    const deps = buildDeps({ setEditingEvent, setIsModalOpen });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    const event = { id: 'e1', title: 'My Event' } as Parameters<typeof result.current.handleEditEvent>[0];
    act(() => result.current.handleEditEvent(event));

    expect(setEditingEvent).toHaveBeenCalledWith(event);
    expect(setIsModalOpen).toHaveBeenCalledWith(true);
  });

  it('handleCloseModal should close modal and clear editing event', () => {
    const setIsModalOpen = vi.fn();
    const setEditingEvent = vi.fn();
    const deps = buildDeps({ setIsModalOpen, setEditingEvent });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    act(() => result.current.handleCloseModal());

    expect(setIsModalOpen).toHaveBeenCalledWith(false);
    expect(setEditingEvent).toHaveBeenCalledWith(null);
  });

  it('handlePrevMonth should subtract one month', () => {
    const setCurrentMonth = vi.fn();
    const deps = buildDeps({ setCurrentMonth });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    act(() => result.current.handlePrevMonth());

    expect(setCurrentMonth).toHaveBeenCalledTimes(1);
    const updaterFn = setCurrentMonth.mock.calls[0][0];
    const now = new Date('2026-02-15');
    const result2 = updaterFn(now);
    expect(result2.getMonth()).toBe(0); // January
  });

  it('handleNextMonth should add one month', () => {
    const setCurrentMonth = vi.fn();
    const deps = buildDeps({ setCurrentMonth });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    act(() => result.current.handleNextMonth());

    const updaterFn = setCurrentMonth.mock.calls[0][0];
    const now = new Date('2026-02-15');
    const result2 = updaterFn(now);
    expect(result2.getMonth()).toBe(2); // March
  });

  it('handleJumpToToday should set current month to today', () => {
    const setCurrentMonth = vi.fn();
    const deps = buildDeps({ setCurrentMonth });
    const { result } = renderHook(() => useCalendarHandlers(deps));

    act(() => result.current.handleJumpToToday());

    expect(setCurrentMonth).toHaveBeenCalledTimes(1);
    const calledWith = setCurrentMonth.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Date);
  });
});
