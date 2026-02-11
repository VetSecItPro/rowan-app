/**
 * Haptic Feedback Utility
 *
 * Wraps @capacitor/haptics with graceful degradation.
 * No-op on web; fires native haptics on iOS/Android.
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative, isPluginAvailable } from './capacitor';

/**
 * Trigger an impact haptic (light, medium, or heavy).
 * Defaults to Light for tab taps and UI interactions.
 */
export async function triggerHaptic(
  style: ImpactStyle = ImpactStyle.Light
): Promise<void> {
  if (!isNative || !isPluginAvailable('Haptics')) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Silently fail — haptics are non-critical
  }
}

/**
 * Trigger a selection change haptic (subtle tick).
 * Use for toggles, switches, and selection changes.
 */
export async function triggerSelectionHaptic(): Promise<void> {
  if (!isNative || !isPluginAvailable('Haptics')) return;
  try {
    await Haptics.selectionChanged();
  } catch {
    // Silently fail
  }
}

// Re-export ImpactStyle for convenience
export { ImpactStyle };
