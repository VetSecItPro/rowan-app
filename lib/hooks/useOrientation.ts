'use client';

import { useState, useEffect, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape';

interface OrientationState {
  orientation: Orientation;
  isLandscape: boolean;
  isPortrait: boolean;
  /** True if landscape on a small screen (phone in landscape) */
  isCompactLandscape: boolean;
  /** Screen dimensions */
  width: number;
  height: number;
  /** True if we have limited vertical space */
  isVerticallyConstrained: boolean;
}

/**
 * Hook to detect device orientation and provide responsive helpers.
 *
 * Use this when you need to:
 * - Show/hide elements based on orientation
 * - Adjust layouts for landscape on mobile
 * - Handle iPhone notch in landscape mode
 *
 * @example
 * ```tsx
 * const { isCompactLandscape, isLandscape } = useOrientation();
 *
 * return (
 *   <div className={isCompactLandscape ? 'flex-row gap-2' : 'flex-col gap-4'}>
 *     {!isCompactLandscape && <Header />}
 *     <Content />
 *   </div>
 * );
 * ```
 */
export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        isLandscape: false,
        isPortrait: true,
        isCompactLandscape: false,
        width: 0,
        height: 0,
        isVerticallyConstrained: false,
      };
    }

    return getOrientationState();
  });

  // Calculate orientation state from window
  function getOrientationState(): OrientationState {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isPortrait = !isLandscape;

    // Compact landscape = landscape on phone (height < 500px)
    const isCompactLandscape = isLandscape && height < 500;

    // Vertically constrained = not much vertical space (< 600px)
    const isVerticallyConstrained = height < 600;

    return {
      orientation: isLandscape ? 'landscape' : 'portrait',
      isLandscape,
      isPortrait,
      isCompactLandscape,
      width,
      height,
      isVerticallyConstrained,
    };
  }

  // Update state on orientation/resize changes
  const updateOrientation = useCallback(() => {
    setState(getOrientationState());
  }, []);

  useEffect(() => {
    // Update on mount
    updateOrientation();

    // Listen for resize events
    window.addEventListener('resize', updateOrientation);

    // Also listen for orientation change events (mobile)
    window.addEventListener('orientationchange', updateOrientation);

    // Some browsers also support screen.orientation
    if (screen.orientation) {
      screen.orientation.addEventListener('change', updateOrientation);
    }

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', updateOrientation);
      }
    };
  }, [updateOrientation]);

  return state;
}

/**
 * Hook that returns true only when in compact landscape mode.
 * Lighter alternative to full useOrientation for simple show/hide cases.
 */
export function useIsCompactLandscape(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isCompactHeight = window.innerHeight < 500;
      setIsCompact(isLandscape && isCompactHeight);
    };

    checkCompact();
    window.addEventListener('resize', checkCompact);
    window.addEventListener('orientationchange', checkCompact);

    return () => {
      window.removeEventListener('resize', checkCompact);
      window.removeEventListener('orientationchange', checkCompact);
    };
  }, []);

  return isCompact;
}

/**
 * Media query hook for orientation-specific styling.
 * Returns class names to apply based on orientation.
 */
export function useOrientationClasses() {
  const { isCompactLandscape, isLandscape, isVerticallyConstrained } = useOrientation();

  return {
    // Apply these classes to containers that need compact spacing
    containerClass: isCompactLandscape
      ? 'landscape-compact'
      : isVerticallyConstrained
        ? 'tablet-landscape-compact'
        : '',

    // Apply to headers that should shrink in landscape
    headerClass: isCompactLandscape ? 'landscape-header-compact' : '',

    // Apply to hero/banner sections
    heroClass: isCompactLandscape ? 'landscape-hero-compact' : '',

    // Apply to content that should scroll in landscape
    scrollClass: isCompactLandscape ? 'landscape-scroll' : '',

    // Apply to card grids for horizontal scroll in landscape
    cardsClass: isCompactLandscape ? 'landscape-scroll-x' : '',

    // Apply to form layouts for side-by-side in landscape
    formClass: isCompactLandscape ? 'landscape-grid-2' : '',

    // Hide class for non-essential elements
    hideInLandscape: isCompactLandscape ? 'hidden' : '',

    // Raw booleans for conditional rendering
    isCompactLandscape,
    isLandscape,
    isVerticallyConstrained,
  };
}

export default useOrientation;
