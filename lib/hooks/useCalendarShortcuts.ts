import { useEffect } from 'react';

export interface CalendarShortcutHandlers {
  jumpToToday: () => void;
  previousPeriod: () => void;
  nextPeriod: () => void;
  switchToDay: () => void;
  switchToWeek: () => void;
  switchToMonth: () => void;
  switchToAgenda: () => void;
  switchToList: () => void;
  newEvent: () => void;
  quickAdd: () => void;
  focusSearch: () => void;
  closeModals: () => void;
}

/**
 * Hook for handling keyboard shortcuts in the calendar
 *
 * Shortcuts:
 * - T: Jump to today
 * - ←/→: Previous/next period
 * - D: Switch to day view
 * - W: Switch to week view
 * - M: Switch to month view
 * - A: Switch to agenda view
 * - L: Switch to list view
 * - N: New event
 * - Q: Quick add (natural language)
 * - /: Focus search
 * - Esc: Close modals
 */
export function useCalendarShortcuts(handlers: CalendarShortcutHandlers) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (e.key !== 'Escape') return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 't':
          e.preventDefault();
          handlers.jumpToToday();
          break;
        case 'arrowleft':
          e.preventDefault();
          handlers.previousPeriod();
          break;
        case 'arrowright':
          e.preventDefault();
          handlers.nextPeriod();
          break;
        case 'd':
          e.preventDefault();
          handlers.switchToDay();
          break;
        case 'w':
          e.preventDefault();
          handlers.switchToWeek();
          break;
        case 'm':
          e.preventDefault();
          handlers.switchToMonth();
          break;
        case 'a':
          e.preventDefault();
          handlers.switchToAgenda();
          break;
        case 'l':
          e.preventDefault();
          handlers.switchToList();
          break;
        case 'n':
          e.preventDefault();
          handlers.newEvent();
          break;
        case 'q':
          e.preventDefault();
          handlers.quickAdd();
          break;
        case '/':
          e.preventDefault();
          handlers.focusSearch();
          break;
        case 'escape':
          handlers.closeModals();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
}
