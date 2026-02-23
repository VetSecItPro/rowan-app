/**
 * Unit tests for lib/hooks/useScrollLock.ts
 *
 * Tests scroll locking functionality:
 * - Body and main element scroll prevention
 * - iOS Safari fixed position locking
 * - Scroll position preservation
 * - Cleanup on unmount
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock, lockScroll } from '@/lib/hooks/useScrollLock';

describe('useScrollLock', () => {
  let mainElement: HTMLElement;

  beforeEach(() => {
    // Create main element
    mainElement = document.createElement('main');
    document.body.appendChild(mainElement);

    // Reset styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    mainElement.style.overflow = '';
    mainElement.style.touchAction = '';

    // Mock scrollTop
    Object.defineProperty(mainElement, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document.body, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });

    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    // Only remove if it's still a child of body
    if (mainElement.parentNode === document.body) {
      document.body.removeChild(mainElement);
    }
    vi.restoreAllMocks();
  });

  it('should lock body and main element when enabled', () => {
    renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');
    expect(mainElement.style.overflow).toBe('hidden');
    expect(mainElement.style.touchAction).toBe('none');
  });

  it('should not lock scroll when disabled', () => {
    renderHook(() => useScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(mainElement.style.overflow).toBe('');
  });

  it('should restore scroll on unmount', () => {
    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(mainElement.style.overflow).toBe('');
  });

  it('should update when lock state changes', () => {
    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked),
      { initialProps: { locked: false } }
    );

    expect(document.body.style.overflow).toBe('');

    rerender({ locked: true });

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');

    rerender({ locked: false });

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
  });

  it('should preserve scroll position', () => {
    // Set initial scroll positions
    Object.defineProperty(mainElement, 'scrollTop', { value: 100, writable: true });
    Object.defineProperty(document.body, 'scrollTop', { value: 200, writable: true });

    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked),
      { initialProps: { locked: false } }
    );

    rerender({ locked: true });

    expect(document.body.style.top).toBe('-200px');

    rerender({ locked: false });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 200);
  });

  it('should handle missing main element gracefully', () => {
    // Create a test without the beforeEach main element
    // First clean up the existing main
    const existingMain = document.querySelector('main');
    if (existingMain?.parentNode === document.body) {
      document.body.removeChild(existingMain);
    }

    const { unmount } = renderHook(() => useScrollLock(true));

    // Should still lock body
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');

    unmount();

    // Re-add main element for subsequent tests
    const newMain = document.createElement('main');
    document.body.appendChild(newMain);
  });
});

describe('lockScroll', () => {
  let mainElement: HTMLElement;
  let unlock: () => void;

  beforeEach(() => {
    mainElement = document.createElement('main');
    document.body.appendChild(mainElement);

    document.body.style.overflow = '';
    document.body.style.position = '';
    mainElement.style.overflow = '';

    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    if (unlock) unlock();
    const main = document.querySelector('main');
    if (main && main.parentNode) {
      main.parentNode.removeChild(main);
    }
    vi.restoreAllMocks();
  });

  it('should lock scroll and return unlock function', () => {
    unlock = lockScroll();

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');

    // The function queries for main element, so we need to check it that way
    const main = document.querySelector('main');
    expect(main?.style.overflow).toBe('hidden');

    unlock();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    const mainAfterUnlock = document.querySelector('main');
    expect(mainAfterUnlock?.style.overflow).toBe('');
  });

  it('should preserve scroll position on unlock', () => {
    Object.defineProperty(document.body, 'scrollTop', { value: 150, writable: true });

    unlock = lockScroll();
    unlock();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 150);
  });
});
