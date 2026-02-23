/**
 * Unit tests for lib/hooks/useCalendarGestures.ts
 *
 * Tests swipe gesture handler registration.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useCalendarGestures } from '@/lib/hooks/useCalendarGestures';

const mockUseGesture = vi.fn();

vi.mock('@use-gesture/react', () => ({
  useGesture: (handlers: unknown, options: unknown) => {
    mockUseGesture(handlers, options);
  },
}));

describe('useCalendarGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call useGesture with drag handler', () => {
    const ref = { current: null };
    const handlers = {
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
      enabled: true,
    };

    renderHook(() => useCalendarGestures(ref, handlers));

    expect(mockUseGesture).toHaveBeenCalledTimes(1);
    const [gestureHandlers] = mockUseGesture.mock.calls[0];
    expect(typeof gestureHandlers.onDrag).toBe('function');
  });

  it('should pass target ref and drag options to useGesture', () => {
    const ref = { current: document.createElement('div') };
    const handlers = { onSwipeLeft: vi.fn() };

    renderHook(() => useCalendarGestures(ref, handlers));

    const [, options] = mockUseGesture.mock.calls[0];
    expect(options.target).toBe(ref);
    expect(options.drag).toBeDefined();
    expect(options.drag.axis).toBe('x');
  });

  it('should invoke onSwipeLeft when swipeX is -1', () => {
    const ref = { current: null };
    const onSwipeLeft = vi.fn();
    const handlers = { onSwipeLeft, enabled: true };

    renderHook(() => useCalendarGestures(ref, handlers));

    const [gestureHandlers] = mockUseGesture.mock.calls[0];
    gestureHandlers.onDrag({ swipe: [-1, 0], event: { preventDefault: vi.fn() } });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('should invoke onSwipeRight when swipeX is 1', () => {
    const ref = { current: null };
    const onSwipeRight = vi.fn();
    const handlers = { onSwipeRight, enabled: true };

    renderHook(() => useCalendarGestures(ref, handlers));

    const [gestureHandlers] = mockUseGesture.mock.calls[0];
    gestureHandlers.onDrag({ swipe: [1, 0], event: { preventDefault: vi.fn() } });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('should not invoke callbacks when enabled is false', () => {
    const ref = { current: null };
    const onSwipeLeft = vi.fn();
    const handlers = { onSwipeLeft, enabled: false };

    renderHook(() => useCalendarGestures(ref, handlers));

    const [gestureHandlers] = mockUseGesture.mock.calls[0];
    gestureHandlers.onDrag({ swipe: [-1, 0], event: { preventDefault: vi.fn() } });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
