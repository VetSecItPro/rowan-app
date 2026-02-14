/**
 * Network Status Hook
 *
 * Provides reactive network status with connection quality detection.
 * Uses Capacitor on native platforms, falls back to browser APIs on web.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNetworkStatus,
  watchNetworkStatus,
  getTimeoutForQuality,
  shouldDeferRequest,
  type NetworkStatus,
  type ConnectionQuality,
} from '@/lib/native/network';

export interface UseNetworkStatusResult {
  /** Whether the device is connected to the internet */
  isOnline: boolean;
  /** Connection quality level */
  quality: ConnectionQuality;
  /** Connection type (wifi, cellular, none, unknown) */
  connectionType: string;
  /** Whether non-critical requests should be deferred */
  shouldDefer: boolean;
  /** Recommended request timeout in ms */
  timeout: number;
  /** Force refresh the network status */
  refresh: () => Promise<void>;
}

/**
 * Hook for monitoring network status and connection quality
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [status, setStatus] = useState<NetworkStatus>({
    connected: true,
    connectionType: 'unknown',
    quality: 'good',
  });
  const [_isInitialized, setIsInitialized] = useState(false);

  const refresh = useCallback(async () => {
    const newStatus = await getNetworkStatus();
    setStatus(newStatus);
  }, []);

  // Initialize on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      // Get initial status
      const initialStatus = await getNetworkStatus();
      setStatus(initialStatus);
      setIsInitialized(true);

      // Watch for changes
      cleanup = await watchNetworkStatus((newStatus) => {
        setStatus(newStatus);
      });
    };

    init();

    return () => {
      cleanup?.();
    };
  }, []);

  // Also listen to browser events for immediate feedback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        connected: true,
        connectionType: prev.connectionType === 'none' ? 'unknown' : prev.connectionType,
        quality: 'good',
      }));
      // Refresh to get accurate status from Capacitor
      refresh();
    };

    const handleOffline = () => {
      setStatus({
        connected: false,
        connectionType: 'none',
        quality: 'offline',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  return {
    isOnline: status.connected,
    quality: status.quality,
    connectionType: status.connectionType,
    shouldDefer: shouldDeferRequest(status.quality),
    timeout: getTimeoutForQuality(status.quality),
    refresh,
  };
}

/**
 * Hook for simple online/offline detection
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}

/**
 * Hook that fires callback when transitioning from offline to online.
 * Uses useRef to stabilize the callback so callers don't need to memoize.
 */
export function useOnReconnect(callback: () => void): void {
  const { isOnline } = useNetworkStatus();
  const wasOfflineRef = useRef(false);
  const callbackRef = useRef(callback);
  // Sync ref in effect to avoid writing refs during render
  useEffect(() => { callbackRef.current = callback; });

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      callbackRef.current();
      wasOfflineRef.current = false;
    }
  }, [isOnline]);
}
