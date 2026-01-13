import { useDevice } from '@/lib/contexts/DeviceContext';

interface WindowSize {
  width: number;
  height: number;
}

/**
 * @deprecated Use `useDevice()` from '@/lib/contexts/DeviceContext' instead.
 *
 * This hook is maintained for backwards compatibility but delegates to useDevice internally.
 * The useDevice hook provides windowWidth and windowHeight along with many other device
 * detection features.
 *
 * @example
 * ```tsx
 * // Preferred - use useDevice directly:
 * const { windowWidth, windowHeight } = useDevice();
 *
 * // Legacy usage (still works):
 * const { width, height } = useWindowSize();
 * ```
 */
export function useWindowSize(): WindowSize {
  const { windowWidth, windowHeight } = useDevice();

  return {
    width: windowWidth,
    height: windowHeight,
  };
}
