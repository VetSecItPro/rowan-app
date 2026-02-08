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
    } catch {
      // Capacitor plugin unavailable — fall through to web fallback
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
    } catch {
      // Capacitor listener unavailable — fall through to web fallback
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

// Cached network quality for synchronous access
let cachedQuality: ConnectionQuality = 'good';
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get connection quality synchronously (uses cached value)
 * Call updateNetworkCache() periodically to keep cache fresh
 */
export function getConnectionQualitySync(): ConnectionQuality {
  // Return cached if fresh
  if (Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedQuality;
  }

  // Fallback to browser API for immediate response
  if (typeof navigator !== 'undefined') {
    if (!navigator.onLine) {
      cachedQuality = 'offline';
      cacheTimestamp = Date.now();
      return 'offline';
    }

    // Check Network Information API if available
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection;
    if (connection?.effectiveType) {
      switch (connection.effectiveType) {
        case '4g':
          cachedQuality = 'excellent';
          break;
        case '3g':
          cachedQuality = 'good';
          break;
        case '2g':
        case 'slow-2g':
          cachedQuality = 'poor';
          break;
        default:
          cachedQuality = 'good';
      }
      cacheTimestamp = Date.now();
      return cachedQuality;
    }
  }

  return cachedQuality;
}

/**
 * Update the network quality cache (call this from a React effect)
 */
export async function updateNetworkCache(): Promise<ConnectionQuality> {
  const status = await getNetworkStatus();
  cachedQuality = status.quality;
  cacheTimestamp = Date.now();
  return cachedQuality;
}

/**
 * Initialize network cache and set up auto-refresh
 */
export function initNetworkCache(): () => void {
  // Initial update
  updateNetworkCache();

  // Listen for changes
  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      cachedQuality = 'good';
      cacheTimestamp = Date.now();
      updateNetworkCache(); // Get accurate quality
    };

    const handleOffline = () => {
      cachedQuality = 'offline';
      cacheTimestamp = Date.now();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for connection type changes
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    const handleConnectionChange = () => {
      updateNetworkCache();
    };
    connection?.addEventListener?.('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', handleConnectionChange);
    };
  }

  return () => {};
}
