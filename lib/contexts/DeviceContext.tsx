'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  DEVICE_BREAKPOINTS,
  HEIGHT_THRESHOLDS,
  getDeviceType,
  type DeviceType,
} from '@/lib/constants/breakpoints';

/**
 * Device context value interface.
 * Provides comprehensive device detection for responsive behavior.
 */
export interface DeviceContextValue {
  // Device classification
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;

  // Orientation detection
  isLandscape: boolean;
  isPortrait: boolean;
  isCompactLandscape: boolean;
  isVerticallyConstrained: boolean;

  // Platform detection
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  hasCoarsePointer: boolean;

  // Raw dimensions (for edge cases)
  windowWidth: number;
  windowHeight: number;
}

/**
 * Default values for SSR and initial render.
 * Defaults to desktop to avoid layout shift on most common use case.
 */
const defaultDeviceValue: DeviceContextValue = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  deviceType: 'desktop',
  isLandscape: true,
  isPortrait: false,
  isCompactLandscape: false,
  isVerticallyConstrained: false,
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
  hasCoarsePointer: false,
  windowWidth: 1024,
  windowHeight: 768,
};

const DeviceContext = createContext<DeviceContextValue>(defaultDeviceValue);

/**
 * Detect platform from user agent (only runs on client)
 */
function detectPlatform(): { isIOS: boolean; isAndroid: boolean } {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, isAndroid: false };
  }
  const ua = navigator.userAgent.toLowerCase();
  return {
    isIOS: /iphone|ipad|ipod/.test(ua),
    isAndroid: /android/.test(ua),
  };
}

/**
 * Detect if running as standalone PWA
 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Detect if device has coarse pointer (touch)
 */
function detectCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Calculate device state from window dimensions
 */
function calculateDeviceState(width: number, height: number) {
  const deviceType = getDeviceType(width);
  const isLandscape = width > height;

  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    deviceType,
    isLandscape,
    isPortrait: !isLandscape,
    isCompactLandscape: isLandscape && height < HEIGHT_THRESHOLDS.compactLandscape,
    isVerticallyConstrained: height < HEIGHT_THRESHOLDS.verticallyConstrained,
    windowWidth: width,
    windowHeight: height,
  };
}

interface DeviceProviderProps {
  children: ReactNode;
}

/**
 * DeviceProvider - Single source of truth for device detection.
 *
 * Provides:
 * - Device type classification (mobile/tablet/desktop)
 * - Orientation detection (landscape/portrait)
 * - Platform detection (iOS/Android/PWA)
 * - Touch capability detection
 *
 * Benefits:
 * - Single resize listener for entire app
 * - Consistent breakpoints across all components
 * - Easy to mock for testing
 * - SSR-safe with sensible defaults
 *
 * @example
 * ```tsx
 * // In a component
 * const { isMobile, isDesktop, hasCoarsePointer } = useDevice();
 *
 * return isMobile ? <MobileLayout /> : <DesktopLayout />;
 * ```
 */
export function DeviceProvider({ children }: DeviceProviderProps) {
  // Platform detection (static - doesn't change)
  const [platform] = useState(() => detectPlatform());
  const [isStandalone] = useState(() => detectStandalone());
  const [hasCoarsePointer, setHasCoarsePointer] = useState(() => detectCoarsePointer());

  // Dynamic device state
  const [deviceState, setDeviceState] = useState(() => {
    if (typeof window === 'undefined') {
      return calculateDeviceState(1024, 768);
    }
    return calculateDeviceState(window.innerWidth, window.innerHeight);
  });

  // Throttled resize handler
  const handleResize = useCallback(() => {
    // Use requestAnimationFrame for performance
    requestAnimationFrame(() => {
      setDeviceState(calculateDeviceState(window.innerWidth, window.innerHeight));
      setHasCoarsePointer(detectCoarsePointer());
    });
  }, []);

  useEffect(() => {
    // Initial calculation on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Also listen for orientation change (mobile)
    window.addEventListener('orientationchange', handleResize);

    // Listen for screen.orientation changes if available
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleResize);
      }
    };
  }, [handleResize]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<DeviceContextValue>(
    () => ({
      ...deviceState,
      isIOS: platform.isIOS,
      isAndroid: platform.isAndroid,
      isStandalone,
      hasCoarsePointer,
    }),
    [deviceState, platform.isIOS, platform.isAndroid, isStandalone, hasCoarsePointer]
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

/**
 * Hook to access device context.
 *
 * @example
 * ```tsx
 * const { isMobile, isDesktop, deviceType } = useDevice();
 *
 * if (isMobile) {
 *   return <BottomSheet />;
 * }
 * return <Dropdown />;
 * ```
 */
export function useDevice(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (!context) {
    // Return defaults if used outside provider (graceful degradation)
    return defaultDeviceValue;
  }
  return context;
}

// =============================================================================
// Conditional Render Components
// =============================================================================

interface ConditionalRenderProps {
  children: ReactNode;
  /** Optional fallback content to render when condition is false */
  fallback?: ReactNode;
}

/**
 * Renders children only on mobile devices (< 768px).
 *
 * @example
 * ```tsx
 * <MobileOnly>
 *   <BottomNavigation />
 * </MobileOnly>
 * ```
 */
export function MobileOnly({ children, fallback = null }: ConditionalRenderProps) {
  const { isMobile } = useDevice();
  return <>{isMobile ? children : fallback}</>;
}

/**
 * Renders children only on tablet devices (768px - 1023px).
 *
 * @example
 * ```tsx
 * <TabletOnly>
 *   <TabletSidebar />
 * </TabletOnly>
 * ```
 */
export function TabletOnly({ children, fallback = null }: ConditionalRenderProps) {
  const { isTablet } = useDevice();
  return <>{isTablet ? children : fallback}</>;
}

/**
 * Renders children only on desktop devices (>= 1024px).
 *
 * @example
 * ```tsx
 * <DesktopOnly>
 *   <SideNavigation />
 * </DesktopOnly>
 * ```
 */
export function DesktopOnly({ children, fallback = null }: ConditionalRenderProps) {
  const { isDesktop } = useDevice();
  return <>{isDesktop ? children : fallback}</>;
}

/**
 * Renders children on tablet and desktop (>= 768px).
 * Useful for showing content on larger screens only.
 *
 * @example
 * ```tsx
 * <NotMobile>
 *   <Sidebar />
 * </NotMobile>
 * ```
 */
export function NotMobile({ children, fallback = null }: ConditionalRenderProps) {
  const { isMobile } = useDevice();
  return <>{!isMobile ? children : fallback}</>;
}

/**
 * Renders children on mobile and tablet (< 1024px).
 * Useful for showing content on smaller screens only.
 *
 * @example
 * ```tsx
 * <NotDesktop>
 *   <MobileHeader />
 * </NotDesktop>
 * ```
 */
export function NotDesktop({ children, fallback = null }: ConditionalRenderProps) {
  const { isDesktop } = useDevice();
  return <>{!isDesktop ? children : fallback}</>;
}

/**
 * Renders children only on touch devices (pointer: coarse).
 * Works regardless of screen size - a large touchscreen monitor would match.
 *
 * @example
 * ```tsx
 * <TouchOnly>
 *   <SwipeHint />
 * </TouchOnly>
 * ```
 */
export function TouchOnly({ children, fallback = null }: ConditionalRenderProps) {
  const { hasCoarsePointer } = useDevice();
  return <>{hasCoarsePointer ? children : fallback}</>;
}

export default DeviceProvider;
