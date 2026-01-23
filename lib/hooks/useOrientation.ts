'use client';

import { useDevice } from '@/lib/contexts/DeviceContext';

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
 * @deprecated Use `useDevice()` from '@/lib/contexts/DeviceContext' instead.
 * This hook is maintained for backwards compatibility but delegates to useDevice internally.
 *
 * Hook to detect device orientation and provide responsive helpers.
 *
 * @example
 * ```tsx
 * // Preferred - use useDevice directly:
 * const { isCompactLandscape, isLandscape } = useDevice();
 *
 * // Legacy usage (still works):
 * const { isCompactLandscape, isLandscape } = useOrientation();
 * ```
 */
export function useOrientation(): OrientationState {
  const device = useDevice();

  return {
    orientation: device.isLandscape ? 'landscape' : 'portrait',
    isLandscape: device.isLandscape,
    isPortrait: device.isPortrait,
    isCompactLandscape: device.isCompactLandscape,
    width: device.windowWidth,
    height: device.windowHeight,
    isVerticallyConstrained: device.isVerticallyConstrained,
  };
}

/**
 * @deprecated Use `useDevice().isCompactLandscape` instead.
 *
 * Hook that returns true only when in compact landscape mode.
 */
export function useIsCompactLandscape(): boolean {
  const { isCompactLandscape } = useDevice();
  return isCompactLandscape;
}

/**
 * @deprecated Use `useDevice()` directly and construct classes as needed.
 *
 * Media query hook for orientation-specific styling.
 * Returns class names to apply based on orientation.
 */
export function useOrientationClasses() {
  const { isCompactLandscape, isLandscape, isVerticallyConstrained } = useDevice();

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
