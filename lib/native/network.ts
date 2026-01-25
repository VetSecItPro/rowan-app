/**
 * Network Native Bridge
 *
 * Detects network status and connection quality using Capacitor.
 * Falls back to browser APIs when running on web.
 */

import { isNative } from './capacitor';

// Types from the plugin
type NetworkPlugin = typeof import('@capacitor/network').Network;
type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

// Dynamic import to avoid bundling issues on web
let NetworkPlugin: NetworkPlugin | null = null;

async function getNetworkPlugin(): Promise<NetworkPlugin | null> {
  if (!isNative) return null;

  if (!NetworkPlugin) {
    const module = await import('@capacitor/network');
    NetworkPlugin = module.Network;
  }
  return NetworkPlugin;
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface NetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
  quality: ConnectionQuality;
}

/**
 * Check if network detection is available
 */
export function isNetworkAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'onLine' in navigator;
}

/**
 * Map connection type to quality level
 */
function getQualityFromType(type: ConnectionType, connected: boolean): ConnectionQuality {
  if (!connected || type === 'none') return 'offline';

  switch (type) {
    case 'wifi':
      return 'excellent';
    case 'cellular':
      // Assume 4G for cellular (native can provide more detail)
      return 'excellent';
    default:
      return 'good';
  }
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const plugin = await getNetworkPlugin();

  if (plugin) {
    try {
      const status = await plugin.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType as ConnectionType,
        quality: getQualityFromType(status.connectionType as ConnectionType, status.connected),
      };
    } catch (error) {
      console.warn('Failed to get network status from Capacitor:', error);
    }
  }

  // Web fallback
  const connected = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    connected,
    connectionType: connected ? 'unknown' : 'none',
    quality: connected ? 'good' : 'offline',
  };
}

/**
 * Check if currently online
 */
export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return status.connected;
}

/**
 * Get connection quality level
 */
export async function getConnectionQuality(): Promise<ConnectionQuality> {
  const status = await getNetworkStatus();
  return status.quality;
}

/**
 * Watch for network status changes
 * Returns cleanup function to stop watching
 */
export async function watchNetworkStatus(
  callback: (status: NetworkStatus) => void
): Promise<() => void> {
  const plugin = await getNetworkPlugin();

  if (plugin) {
    try {
      const handle = await plugin.addListener('networkStatusChange', (status) => {
        callback({
          connected: status.connected,
          connectionType: status.connectionType as ConnectionType,
          quality: getQualityFromType(status.connectionType as ConnectionType, status.connected),
        });
      });

      return () => {
        handle.remove();
      };
    } catch (error) {
      console.warn('Failed to watch network status:', error);
    }
  }

  // Web fallback using browser events
  const handleOnline = () => {
    callback({
      connected: true,
      connectionType: 'unknown',
      quality: 'good',
    });
  };

  const handleOffline = () => {
    callback({
      connected: false,
      connectionType: 'none',
      quality: 'offline',
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
}

/**
 * Get recommended request timeout based on connection quality
 */
export function getTimeoutForQuality(quality: ConnectionQuality): number {
  switch (quality) {
    case 'excellent':
      return 10000; // 10s
    case 'good':
      return 15000; // 15s
    case 'poor':
      return 30000; // 30s
    case 'offline':
      return 5000; // 5s (will fail anyway)
  }
}

/**
 * Check if we should defer non-critical requests
 */
export function shouldDeferRequest(quality: ConnectionQuality): boolean {
  return quality === 'poor' || quality === 'offline';
}
