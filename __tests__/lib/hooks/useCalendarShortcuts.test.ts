/**
 * Unit tests for lib/hooks/useCalendarShortcuts.ts
 *
 * Tests calendar keyboard shortcuts:
 * - Navigation shortcuts
 * - View switching
 * - Action shortcuts
 * - Input element exclusion
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarShortcuts, type CalendarShortcutHandlers } from '@/lib/hooks/useCalendarShortcuts';

describe('useCalendarShortcuts', () => {
  let handlers: CalendarShortcutHandlers;

  beforeEach(() => {
    handlers = {
      jumpToToday: vi.fn(),
      previousPeriod: vi.fn(),
      nextPeriod: vi.fn(),
      switchToDay: vi.fn(),
      switchToWeek: vi.fn(),
      switchToMonth: vi.fn(),
      switchToAgenda: vi.fn(),
      switchToList: vi.fn(),
      newEvent: vi.fn(),
      quickAdd: vi.fn(),
      focusSearch: vi.fn(),
      closeModals: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should jump to today on T key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 't' });
    window.dispatchEvent(event);

    expect(handlers.jumpToToday).toHaveBeenCalled();
  });

  it('should navigate to previous period on left arrow', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(event);

    expect(handlers.previousPeriod).toHaveBeenCalled();
  });

  it('should navigate to next period on right arrow', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(event);

    expect(handlers.nextPeriod).toHaveBeenCalled();
  });

  it('should switch to day view on D key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'd' });
    window.dispatchEvent(event);

    expect(handlers.switchToDay).toHaveBeenCalled();
  });

  it('should switch to week view on W key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);

    expect(handlers.switchToWeek).toHaveBeenCalled();
  });

  it('should switch to month view on M key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'm' });
    window.dispatchEvent(event);

    expect(handlers.switchToMonth).toHaveBeenCalled();
  });

  it('should switch to agenda view on A key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(event);

    expect(handlers.switchToAgenda).toHaveBeenCalled();
  });

  it('should switch to list view on L key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);

    expect(handlers.switchToList).toHaveBeenCalled();
  });

  it('should create new event on N key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'n' });
    window.dispatchEvent(event);

    expect(handlers.newEvent).toHaveBeenCalled();
  });

  it('should open quick add on Q key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'q' });
    window.dispatchEvent(event);

    expect(handlers.quickAdd).toHaveBeenCalled();
  });

  it('should focus search on / key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: '/' });
    window.dispatchEvent(event);

    expect(handlers.focusSearch).toHaveBeenCalled();
  });

  it('should close modals on Escape key', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(handlers.closeModals).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: 't', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });

    input.dispatchEvent(event);

    expect(handlers.jumpToToday).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should allow Escape key even in inputs', () => {
    renderHook(() => useCalendarShortcuts(handlers));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });

    input.dispatchEvent(event);

    expect(handlers.closeModals).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useCalendarShortcuts(handlers));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
