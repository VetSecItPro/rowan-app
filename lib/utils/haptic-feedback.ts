/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback across the application
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticConfig {
  /** Whether haptic feedback is enabled (can be disabled in user preferences) */
  enabled: boolean;
  /** Device type detection for appropriate feedback */
  isIOS: boolean;
  /** Vibration support detection */
  hasVibration: boolean;
}

class HapticFeedbackManager {
  private config: HapticConfig | null = null;

  private getConfig(): HapticConfig {
    // Lazy initialization to avoid SSR issues (navigator doesn't exist on server)
    if (!this.config) {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        this.config = {
          enabled: true, // Could be tied to user preferences
          isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
          hasVibration: 'vibrate' in navigator,
        };
      } else {
        // Server-side fallback - haptics disabled
        this.config = {
          enabled: false,
          isIOS: false,
          hasVibration: false,
        };
      }
    }
    return this.config;
  }

  /**
   * Triggers haptic feedback based on type
   */
  public trigger(type: HapticType): void {
    const config = this.getConfig();
    if (!config.enabled) return;

    // iOS Haptic Engine (preferred when available)
    if (config.isIOS && typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      this.triggerIOSHaptic(type);
      return;
    }

    // Fallback to vibration API
    if (config.hasVibration) {
      this.triggerVibration(type);
    }
  }

  /**
   * iOS Haptic Feedback using requestPermission (iOS 13+)
   */
  private triggerIOSHaptic(type: HapticType): void {
    // SSR guard - navigator only available in browser
    if (typeof navigator === 'undefined') return;

    try {
      // iOS devices support the Haptic Feedback API through DeviceMotionEvent
      // This is a simulation since Web Haptic API is not widely supported
      const patterns = {
        light: [10],
        medium: [15],
        heavy: [25],
        success: [10, 50, 10],
        warning: [15, 100, 15],
        error: [25, 150, 25],
        selection: [5],
      };

      const pattern = patterns[type] || patterns.light;
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.debug('iOS haptic feedback failed:', error);
      this.triggerVibration(type);
    }
  }

  /**
   * Vibration API fallback for Android and other devices
   */
  private triggerVibration(type: HapticType): void {
    // SSR guard - navigator only available in browser
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    const patterns = {
      light: [5],
      medium: [10],
      heavy: [20],
      success: [5, 25, 5],
      warning: [10, 50, 10],
      error: [20, 100, 20],
      selection: [3],
    };

    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * Enable/disable haptic feedback
   */
  public setEnabled(enabled: boolean): void {
    const config = this.getConfig();
    config.enabled = enabled;
  }

  /**
   * Check if haptic feedback is supported
   */
  public isSupported(): boolean {
    const config = this.getConfig();
    return config.hasVibration || config.isIOS;
  }
}

// Global instance
const hapticManager = new HapticFeedbackManager();

// Convenience functions for common use cases
export const haptic = {
  /** Light tap feedback for buttons and touch interactions */
  light: () => hapticManager.trigger('light'),

  /** Medium tap feedback for important actions */
  medium: () => hapticManager.trigger('medium'),

  /** Heavy tap feedback for critical actions */
  heavy: () => hapticManager.trigger('heavy'),

  /** Success feedback for completed actions */
  success: () => hapticManager.trigger('success'),

  /** Warning feedback for cautionary actions */
  warning: () => hapticManager.trigger('warning'),

  /** Error feedback for failed actions */
  error: () => hapticManager.trigger('error'),

  /** Selection feedback for picking items */
  selection: () => hapticManager.trigger('selection'),

  /** Enable/disable haptic feedback */
  setEnabled: (enabled: boolean) => hapticManager.setEnabled(enabled),

  /** Check if haptic feedback is supported */
  isSupported: () => hapticManager.isSupported(),
};

// React hook for haptic feedback
export function useHapticFeedback() {
  return {
    /** Trigger haptic feedback on button press */
    onPress: (type: HapticType = 'light') => {
      return () => hapticManager.trigger(type);
    },

    /** Trigger haptic feedback on successful action */
    onSuccess: () => hapticManager.trigger('success'),

    /** Trigger haptic feedback on error */
    onError: () => hapticManager.trigger('error'),

    /** Trigger haptic feedback on warning */
    onWarning: () => hapticManager.trigger('warning'),

    /** Check if haptic feedback is supported */
    isSupported: hapticManager.isSupported(),
  };
}

// CSS class names for enhanced touch interactions
export const hapticStyles = {
  /** Base touch-friendly interaction styles */
  base: 'transition-all duration-150 ease-out',

  /** Light press effect */
  light: 'active:scale-[0.98] active:opacity-90',

  /** Medium press effect */
  medium: 'active:scale-[0.96] active:opacity-85',

  /** Heavy press effect */
  heavy: 'active:scale-[0.94] active:opacity-80',

  /** Bounce effect for playful interactions */
  bounce: 'active:scale-105 transition-transform duration-100',

  /** Combined haptic class names */
  touchable: 'transition-all duration-150 ease-out active:scale-[0.98] active:opacity-90',
};

export default haptic;