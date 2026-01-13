/**
 * Canonical breakpoint values for responsive design.
 * These align with Tailwind CSS breakpoints for consistency.
 *
 * Usage:
 * - Use CSS media queries (sm:, md:, lg:) for simple show/hide
 * - Use DeviceContext (useDevice hook) for component behavior changes
 */

/**
 * Tailwind-aligned breakpoints in pixels
 */
export const BREAKPOINTS = {
  /** Small screens (640px) - large phones */
  sm: 640,
  /** Medium screens (768px) - tablets */
  md: 768,
  /** Large screens (1024px) - laptops/desktops */
  lg: 1024,
  /** Extra large screens (1280px) - large desktops */
  xl: 1280,
  /** 2XL screens (1536px) - very large displays */
  '2xl': 1536,
} as const;

/**
 * Device classification breakpoints.
 * These define how we categorize devices by screen width.
 *
 * - Mobile: width < 768px (matches Tailwind md: breakpoint)
 * - Tablet: 768px <= width < 1024px
 * - Desktop: width >= 1024px (matches Tailwind lg: breakpoint)
 */
export const DEVICE_BREAKPOINTS = {
  /** Width below this is considered mobile */
  mobile: BREAKPOINTS.md, // 768px
  /** Width at or above this is considered desktop */
  desktop: BREAKPOINTS.lg, // 1024px
} as const;

/**
 * Height thresholds for vertical space detection
 */
export const HEIGHT_THRESHOLDS = {
  /** Compact landscape (phone rotated) */
  compactLandscape: 500,
  /** Vertically constrained (limited vertical space) */
  verticallyConstrained: 600,
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Determine device type from window width
 */
export function getDeviceType(width: number): DeviceType {
  if (width < DEVICE_BREAKPOINTS.mobile) return 'mobile';
  if (width < DEVICE_BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}
