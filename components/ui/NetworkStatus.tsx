'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, AlertCircle, SignalLow } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Network Status Indicator
 *
 * Shows a banner when the user loses network connectivity.
 * Displays pending offline actions count and sync status.
 * Shows connection quality warnings for poor networks.
 * Automatically dismisses when connection is restored.
 */

interface NetworkStatusProps {
  /** Number of pending offline actions */
  pendingActions?: number;
  /** Whether the queue is currently syncing */
  isSyncing?: boolean;
  /** Number of failed actions */
  failedCount?: number;
}

export function NetworkStatus({
  pendingActions = 0,
  isSyncing = false,
  failedCount = 0,
}: NetworkStatusProps) {
  const { isOnline, quality } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showPoorConnectionWarning, setShowPoorConnectionWarning] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      // Show "back online" message briefly if we were offline
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
      setWasOffline(false);
    } else if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    }
  }, [isOnline, wasOffline]);

  // Show poor connection warning briefly
  useEffect(() => {
    if (quality === 'poor' && isOnline) {
      setShowPoorConnectionWarning(true);
      const timer = setTimeout(() => setShowPoorConnectionWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [quality, isOnline]);

  // Determine what to show
  const shouldShowBanner = !isOnline || showBanner || (pendingActions > 0 && !isOnline);

  if (!shouldShowBanner && pendingActions === 0 && failedCount === 0) return null;

  // Offline with pending actions - show persistent indicator
  if (!isOnline && pendingActions > 0) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium bg-amber-500 text-white transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <CloudOff className="w-4 h-4" />
        <span>Offline - {pendingActions} action{pendingActions !== 1 ? 's' : ''} will sync when online</span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
          <RefreshCw className="w-3 h-3" />
          <span>Queued</span>
        </div>
      </div>
    );
  }

  // Just went offline
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-red-500 text-white transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <WifiOff className="w-4 h-4" />
        <span>No internet connection</span>
      </div>
    );
  }

  // Syncing indicator
  if (isSyncing && pendingActions > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-blue-500 text-white transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing {pendingActions} action{pendingActions !== 1 ? 's' : ''}...</span>
      </div>
    );
  }

  // Back online message
  if (showBanner && isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-green-500 text-white animate-slide-down transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <Wifi className="w-4 h-4" />
        <span>You&apos;re back online</span>
      </div>
    );
  }

  // Failed actions warning (persistent until cleared)
  if (failedCount > 0 && isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-orange-500 text-white transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <AlertCircle className="w-4 h-4" />
        <span>{failedCount} action{failedCount !== 1 ? 's' : ''} failed to sync</span>
      </div>
    );
  }

  // Poor connection warning (brief, auto-dismiss)
  if (showPoorConnectionWarning && quality === 'poor') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-amber-600 text-white transition-all duration-300"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <SignalLow className="w-4 h-4" />
        <span>Poor connection - using cached data</span>
      </div>
    );
  }

  return null;
}

/**
 * Offline Queue Status Badge
 *
 * Small badge showing pending offline actions count
 * Can be placed anywhere in the UI
 */
export function OfflineQueueBadge({
  pendingCount,
  isProcessing,
  className = '',
}: {
  pendingCount: number;
  isProcessing: boolean;
  className?: string;
}) {
  if (pendingCount === 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-amber-900/30 text-amber-300 text-xs font-medium rounded-full ${className}`}
    >
      {isProcessing ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        <CloudOff className="w-3 h-3" />
      )}
      <span>{pendingCount} pending</span>
    </div>
  );
}
