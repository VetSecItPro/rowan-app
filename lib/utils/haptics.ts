/**
 * Haptic feedback utilities for mobile interactions
 * Provides tactile feedback for better UX on touch devices
 */

import { logger } from '@/lib/logger';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticPattern {
  vibrate?: number | number[];
  intensity?: number;
}

type HapticNavigator = Navigator & {
  hapticEngine?: {
    trigger: (intensity: number) => void;
  };
};

const hapticPatterns: Record<HapticFeedbackType, HapticPattern> = {
  light: { vibrate: 10 },
  medium: { vibrate: 20 },
  heavy: { vibrate: 30 },
  success: { vibrate: [10, 50, 10] },
  warning: { vibrate: [20, 100, 20] },
  error: { vibrate: [30, 100, 30, 100, 30] },
  selection: { vibrate: 5 },
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator || 'hapticEngine' in navigator;
}

/**
 * Trigger haptic feedback with specified type
 */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  // Check if running in browser
  if (typeof window === 'undefined') return;

  const pattern = hapticPatterns[type];

  // iOS Haptic Engine (Safari on iOS)
  const hapticNavigator = navigator as HapticNavigator;
  if ('hapticEngine' in navigator && typeof hapticNavigator.hapticEngine === 'object') {
    try {
      const intensity = pattern.intensity || 0.5;
      hapticNavigator.hapticEngine?.trigger(intensity);
      return;
    } catch {
      // Fallback to vibration API
    }
  }

  // Vibration API (most Android browsers)
  if ('vibrate' in navigator && pattern.vibrate) {
    try {
      navigator.vibrate(pattern.vibrate);
    } catch (error) {
      logger.warn('Haptic feedback failed:', { component: 'lib-haptics', error: error });
    }
  }
}

/**
 * Trigger haptic feedback on button press
 */
export function hapticButtonPress(): void {
  triggerHaptic('light');
}

/**
 * Trigger haptic feedback on selection change
 */
export function hapticSelection(): void {
  triggerHaptic('selection');
}

/**
 * Trigger haptic feedback on success action
 */
export function hapticSuccess(): void {
  triggerHaptic('success');
}

/**
 * Trigger haptic feedback on error
 */
export function hapticError(): void {
  triggerHaptic('error');
}

/**
 * Trigger haptic feedback on warning
 */
export function hapticWarning(): void {
  triggerHaptic('warning');
}

/**
 * Trigger haptic feedback on drag start
 */
export function hapticDragStart(): void {
  triggerHaptic('medium');
}

/**
 * Trigger haptic feedback on drag end/drop
 */
export function hapticDragEnd(): void {
  triggerHaptic('light');
}

/**
 * Trigger haptic feedback on toggle
 */
export function hapticToggle(): void {
  triggerHaptic('light');
}

/**
 * Create a haptic-enabled click handler
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  hapticType: HapticFeedbackType = 'light'
): T {
  return ((...args: Parameters<T>) => {
    triggerHaptic(hapticType);
    return handler(...args);
  }) as T;
}

// Convenience exports for common patterns
export const hapticLight = () => triggerHaptic('light');
export const hapticMedium = () => triggerHaptic('medium');
export const hapticHeavy = () => triggerHaptic('heavy');
