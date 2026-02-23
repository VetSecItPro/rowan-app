/**
 * Unit tests for lib/hooks/useKeyboardShortcuts.ts
 *
 * Tests keyboard shortcut handling:
 * - Key combinations
 * - Modifier keys (ctrl, shift, alt)
 * - Input element exclusion
 * - Escape key override
 * - Enable/disable toggle
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, type KeyboardShortcutHandler } from '@/lib/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHandler = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register keyboard shortcuts', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', ctrl: true, handler: mockHandler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle simple key without modifiers', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 'k', handler: mockHandler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should handle ctrl/cmd key', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', ctrl: true, handler: mockHandler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Test Ctrl
    let event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // Test Cmd (metaKey)
    event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
    window.dispatchEvent(event);
    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  it('should handle shift key', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 'p', ctrl: true, shift: true, handler: mockHandler, description: 'Print' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true });
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should handle alt key', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 'f', alt: true, handler: mockHandler, description: 'Format' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'f', altKey: true });
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should not trigger when modifiers do not match', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', ctrl: true, handler: mockHandler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without ctrl
    const event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should prevent default behavior', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', ctrl: true, handler: mockHandler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', handler: mockHandler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });

    input.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not trigger shortcuts when typing in textarea', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', handler: mockHandler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });

    textarea.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should allow Escape key even in inputs', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 'Escape', handler: mockHandler, description: 'Close' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });

    input.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should handle case-insensitive key matching', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 'S', handler: mockHandler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should not register shortcuts when disabled', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', handler: mockHandler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    const event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', ctrl: true, handler: handler1, description: 'Save' },
      { key: 'o', ctrl: true, handler: handler2, description: 'Open' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    let event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handler1).toHaveBeenCalledTimes(1);

    event = new KeyboardEvent('keydown', { key: 'o', ctrlKey: true });
    window.dispatchEvent(event);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listener on unmount', () => {
    const shortcuts: KeyboardShortcutHandler[] = [
      { key: 's', handler: mockHandler, description: 'Search' },
    ];

    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
