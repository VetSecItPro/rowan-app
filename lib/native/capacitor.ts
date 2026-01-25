/**
 * Capacitor Native Bridge
 *
 * This module provides platform detection and native feature access.
 * It gracefully degrades to web APIs when running in a browser.
 */

import { Capacitor } from '@capacitor/core';

// Platform detection
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

/**
 * Check if a specific plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Convert a web URL to a native-compatible URL if needed
 */
export function convertFileSrc(filePath: string): string {
  return Capacitor.convertFileSrc(filePath);
}

/**
 * Device info for analytics and debugging
 */
export async function getDeviceInfo() {
  if (!isNative) {
    return {
      platform: 'web',
      isNative: false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }

  return {
    platform: getPlatform(),
    isNative: true,
    // Additional device info can be added with @capacitor/device plugin
  };
}
