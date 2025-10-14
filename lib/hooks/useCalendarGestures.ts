import { useGesture } from '@use-gesture/react';
import { RefObject } from 'react';

export interface CalendarGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling touch gestures in the calendar
 *
 * Gestures:
 * - Swipe Left: Navigate to next period
 * - Swipe Right: Navigate to previous period
 */
export function useCalendarGestures(
  ref: RefObject<HTMLElement>,
  handlers: CalendarGestureHandlers
) {
  const { onSwipeLeft, onSwipeRight, enabled = true } = handlers;

  useGesture(
    {
      onDrag: ({ swipe: [swipeX], event }) => {
        if (!enabled) return;

        // Prevent default to avoid scrolling while swiping
        if (Math.abs(swipeX) > 0) {
          event.preventDefault();
        }

        // Swipe left (move to next)
        if (swipeX === -1 && onSwipeLeft) {
          onSwipeLeft();
        }
        // Swipe right (move to previous)
        else if (swipeX === 1 && onSwipeRight) {
          onSwipeRight();
        }
      },
    },
    {
      target: ref,
      drag: {
        swipe: {
          distance: 50, // Minimum distance to trigger swipe (in pixels)
          velocity: 0.3, // Minimum velocity to trigger swipe
        },
        // Only detect horizontal swipes
        axis: 'x',
      },
    }
  );
}
