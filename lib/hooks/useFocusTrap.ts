'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Return focus to the previously focused element when trap is disabled */
  returnFocus?: boolean;
  /** Initial element to focus when trap is enabled */
  initialFocus?: HTMLElement | null;
  /** Whether to auto-focus the first focusable element */
  autoFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Hook to trap focus within a container element
 * Essential for accessibility in modals, dialogs, and overlays
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    returnFocus = true,
    initialFocus = null,
    autoFocus = true,
  } = options;

  const containerRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
      // Filter out elements with display: none or visibility: hidden
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Focus the first focusable element
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  // Focus the last focusable element
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // Handle Tab key navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || event.key !== 'Tab') return;

    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // Handle Shift+Tab (backwards)
    if (event.shiftKey) {
      if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Handle Tab (forwards)
      if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [enabled, getFocusableElements]);

  // Set up the focus trap
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the currently focused element to restore later
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    if (autoFocus) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (initialFocus) {
          initialFocus.focus();
        } else {
          focusFirst();
        }
      });
    }

    // Add event listener for Tab key
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to previously focused element
      if (returnFocus && previouslyFocusedRef.current) {
        requestAnimationFrame(() => {
          previouslyFocusedRef.current?.focus();
        });
      }
    };
  }, [enabled, autoFocus, initialFocus, returnFocus, focusFirst, handleKeyDown]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}

/**
 * Component props for FocusTrap wrapper
 */
export interface FocusTrapProps extends UseFocusTrapOptions {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}
