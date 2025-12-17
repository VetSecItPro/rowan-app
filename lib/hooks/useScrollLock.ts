'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to lock scrolling on the correct scroll container.
 *
 * In our app layout, the main scroll container is the `<main>` element
 * with `overflow-auto`, not `document.body`. This hook properly targets
 * the main element for scroll locking on iOS Safari and other mobile browsers.
 *
 * Features:
 * - Targets the correct scroll container (main element or body fallback)
 * - Preserves scroll position when locking
 * - Handles iOS Safari momentum scrolling
 * - Cleans up properly on unmount
 *
 * @param isLocked - Whether scroll should be locked
 */
export function useScrollLock(isLocked: boolean): void {
  // Store original overflow and scroll position
  const scrollPositionRef = useRef<{ main: number; body: number }>({ main: 0, body: 0 });
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (isLocked && !isLockedRef.current) {
      // Find the main scroll container
      const mainElement = document.querySelector('main');

      // Store current scroll positions
      scrollPositionRef.current = {
        main: mainElement?.scrollTop ?? 0,
        body: document.body.scrollTop || document.documentElement.scrollTop,
      };

      // Lock the main element if it exists (primary scroll container)
      if (mainElement) {
        mainElement.style.overflow = 'hidden';
        // iOS Safari: also prevent touchmove to stop rubber-banding
        mainElement.style.touchAction = 'none';
      }

      // Also lock body as fallback and to prevent any edge cases
      document.body.style.overflow = 'hidden';
      // iOS Safari specific: position fixed with width 100% prevents background scroll
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollPositionRef.current.body}px`;

      isLockedRef.current = true;
    } else if (!isLocked && isLockedRef.current) {
      // Find the main scroll container
      const mainElement = document.querySelector('main');

      // Unlock main element
      if (mainElement) {
        mainElement.style.overflow = '';
        mainElement.style.touchAction = '';
        // Restore main scroll position
        mainElement.scrollTop = scrollPositionRef.current.main;
      }

      // Unlock body
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';

      // Restore body scroll position
      window.scrollTo(0, scrollPositionRef.current.body);

      isLockedRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (isLockedRef.current) {
        const mainElement = document.querySelector('main');

        if (mainElement) {
          mainElement.style.overflow = '';
          mainElement.style.touchAction = '';
        }

        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';

        // Restore body scroll position
        window.scrollTo(0, scrollPositionRef.current.body);

        isLockedRef.current = false;
      }
    };
  }, [isLocked]);
}

/**
 * Simple utility function to lock/unlock scroll programmatically.
 * Use the hook version (useScrollLock) in React components for proper cleanup.
 */
export function lockScroll(): () => void {
  const mainElement = document.querySelector('main');
  const scrollPositions = {
    main: mainElement?.scrollTop ?? 0,
    body: document.body.scrollTop || document.documentElement.scrollTop,
  };

  if (mainElement) {
    mainElement.style.overflow = 'hidden';
    mainElement.style.touchAction = 'none';
  }

  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${scrollPositions.body}px`;

  // Return unlock function
  return () => {
    if (mainElement) {
      mainElement.style.overflow = '';
      mainElement.style.touchAction = '';
      mainElement.scrollTop = scrollPositions.main;
    }

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';

    window.scrollTo(0, scrollPositions.body);
  };
}
