/**
 * Haptic Feedback Utilities
 * Provides vibration feedback for touch interactions on supported devices
 */

/**
 * Trigger a light haptic feedback (10ms vibration)
 * Use for: button taps, toggle switches, checkbox selection
 */
export function hapticLight() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/**
 * Trigger a medium haptic feedback (20ms vibration)
 * Use for: navigation changes, modal opens/closes
 */
export function hapticMedium() {
  if ('vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

/**
 * Trigger a heavy haptic feedback (30ms vibration)
 * Use for: destructive actions, errors, important confirmations
 */
export function hapticHeavy() {
  if ('vibrate' in navigator) {
    navigator.vibrate(30);
  }
}

/**
 * Trigger a success haptic pattern (two short pulses)
 * Use for: successful form submissions, completed actions
 */
export function hapticSuccess() {
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}

/**
 * Trigger an error haptic pattern (three short pulses)
 * Use for: form validation errors, failed actions
 */
export function hapticError() {
  if ('vibrate' in navigator) {
    navigator.vibrate([15, 30, 15, 30, 15]);
  }
}

/**
 * Trigger a warning haptic pattern (two medium pulses)
 * Use for: confirmations, warnings
 */
export function hapticWarning() {
  if ('vibrate' in navigator) {
    navigator.vibrate([20, 50, 20]);
  }
}

/**
 * Check if haptic feedback is supported on this device
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Custom haptic pattern
 * @param pattern - Array of durations (vibrate, pause, vibrate, ...)
 */
export function hapticCustom(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
