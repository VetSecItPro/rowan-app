/**
 * Background Location Native Bridge
 *
 * Wraps the custom BackgroundLocation Capacitor plugin for Android.
 * On iOS, background location is handled by the Capacitor Geolocation plugin
 * with background modes enabled in Info.plist.
 * On web, this gracefully returns no-ops.
 */

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { isAndroid, isNative } from './capacitor';

// Plugin interface matching BackgroundLocationPlugin.java
interface BackgroundLocationPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
  addListener(
    eventName: 'locationUpdate',
    listenerFunc: (data: BackgroundLocationEvent) => void
  ): Promise<PluginListenerHandle>;
}

export interface BackgroundLocationEvent {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  timestamp: number;
}

// Register the native plugin — only actually available on Android
const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>('BackgroundLocation');

/**
 * Start background location tracking (Android only).
 * Starts a foreground service with a persistent notification.
 */
export async function startBackgroundLocation(): Promise<boolean> {
  if (!isNative || !isAndroid) {
    return false;
  }

  try {
    await BackgroundLocation.start();
    return true;
  } catch (error) {
    console.error('Failed to start background location:', error);
    return false;
  }
}

/**
 * Stop background location tracking (Android only).
 */
export async function stopBackgroundLocation(): Promise<boolean> {
  if (!isNative || !isAndroid) {
    return false;
  }

  try {
    await BackgroundLocation.stop();
    return true;
  } catch (error) {
    console.error('Failed to stop background location:', error);
    return false;
  }
}

/**
 * Check if the background location service is currently running.
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (!isNative || !isAndroid) {
    return false;
  }

  try {
    const result = await BackgroundLocation.isRunning();
    return result.running;
  } catch {
    return false;
  }
}

/**
 * Listen for background location updates from the native service.
 * Returns a cleanup function to remove the listener.
 */
export function addBackgroundLocationListener(
  callback: (event: BackgroundLocationEvent) => void
): () => void {
  if (!isNative || !isAndroid) {
    return () => {};
  }

  let handle: PluginListenerHandle | null = null;

  BackgroundLocation.addListener('locationUpdate', callback).then((h) => {
    handle = h;
  });

  return () => {
    handle?.remove();
  };
}
