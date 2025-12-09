'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseKeyboardAvoidanceOptions {
  /** Whether keyboard avoidance is enabled */
  enabled?: boolean;
  /** Extra padding below the focused element (in pixels) */
  extraPadding?: number;
  /** Delay before scrolling into view (in ms) */
  scrollDelay?: number;
}

/**
 * Hook to handle iOS virtual keyboard covering inputs.
 * Automatically scrolls focused inputs into view when the keyboard opens.
 *
 * This is particularly important for:
 * - iOS Safari where the keyboard can cover inputs
 * - PWA/standalone mode where viewport behavior differs
 * - Modal forms that might not scroll properly
 */
export function useKeyboardAvoidance(options: UseKeyboardAvoidanceOptions = {}) {
  const {
    enabled = true,
    extraPadding = 20,
    scrollDelay = 100,
  } = options;

  const initialWindowHeight = useRef<number | null>(null);
  const focusedElement = useRef<HTMLElement | null>(null);

  // Check if we're on iOS
  const isIOS = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  // Scroll the focused element into view
  const scrollIntoView = useCallback((element: HTMLElement) => {
    // Use a small delay to let the keyboard animation settle
    setTimeout(() => {
      // Check if element is still focused
      if (document.activeElement !== element) return;

      // Calculate the element's position
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // If element is in the bottom half of the visible area,
      // or partially hidden, scroll it into view
      if (rect.bottom > viewportHeight - extraPadding) {
        // Calculate how much to scroll
        const scrollAmount = rect.bottom - viewportHeight + extraPadding;

        // Try using scrollIntoView first (more reliable on modern browsers)
        if ('scrollIntoView' in element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        } else {
          // Fallback to manual scroll
          window.scrollBy({
            top: scrollAmount,
            behavior: 'smooth',
          });
        }
      }
    }, scrollDelay);
  }, [extraPadding, scrollDelay]);

  // Handle focus event
  const handleFocus = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;

    // Check if it's an input-like element
    const isInputElement =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    if (!isInputElement) return;

    focusedElement.current = target;

    // On iOS, scroll into view
    if (isIOS()) {
      scrollIntoView(target);
    }
  }, [isIOS, scrollIntoView]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    focusedElement.current = null;
  }, []);

  // Handle resize (keyboard open/close changes viewport on some devices)
  const handleResize = useCallback(() => {
    if (!focusedElement.current) return;

    // Check if viewport height decreased (keyboard likely opened)
    if (
      initialWindowHeight.current !== null &&
      window.innerHeight < initialWindowHeight.current * 0.8
    ) {
      scrollIntoView(focusedElement.current);
    }
  }, [scrollIntoView]);

  // Handle visual viewport resize (more reliable on iOS Safari)
  const handleVisualViewportResize = useCallback(() => {
    if (!focusedElement.current) return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    // If viewport height is significantly less than window height,
    // keyboard is likely open
    if (visualViewport.height < window.innerHeight * 0.8) {
      scrollIntoView(focusedElement.current);
    }
  }, [scrollIntoView]);

  useEffect(() => {
    if (!enabled) return;

    // Store initial window height
    initialWindowHeight.current = window.innerHeight;

    // Add focus/blur listeners
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    // Add resize listener for basic viewport changes
    window.addEventListener('resize', handleResize);

    // Use Visual Viewport API if available (preferred for iOS)
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('resize', handleResize);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, [enabled, handleFocus, handleBlur, handleResize, handleVisualViewportResize]);
}

/**
 * Component wrapper that enables keyboard avoidance for its children.
 * Use this to wrap forms or input-heavy sections.
 */
export function KeyboardAvoidingView({
  children,
  className = '',
  ...options
}: UseKeyboardAvoidanceOptions & {
  children: React.ReactNode;
  className?: string;
}) {
  useKeyboardAvoidance(options);

  return (
    <div className={`keyboard-avoiding-container ${className}`}>
      {children}
    </div>
  );
}
