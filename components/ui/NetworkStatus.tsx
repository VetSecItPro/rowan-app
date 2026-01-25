'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, AlertCircle, SignalLow, Database } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue';

/**
 * Network Status Banner
 *
 * YouTube-style offline/online notification banner.
 * Shows when user loses connection and confirms when back online.
 * Displays pending actions and sync status.
 * Self-contained - connects to offline queue automatically.
 */

export function NetworkStatus() {
  const { isOnline, quality } = useNetworkStatus();
  const { pendingCount, failedCount, isProcessing } = useOfflineQueue();

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
  const shouldShowBanner = !isOnline || showBanner || (pendingCount > 0 && !isOnline);

  if (!shouldShowBanner && pendingCount === 0 && failedCount === 0 && !showPoorConnectionWarning) return null;

  // Offline with pending actions - show persistent indicator
  if (!isOnline && pendingCount > 0) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium bg-zinc-800 text-white transition-all duration-300 animate-slide-down border-b border-zinc-700"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span>You&apos;re offline. {pendingCount} change{pendingCount !== 1 ? 's' : ''} will sync when connected.</span>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs">
          <Database className="w-3 h-3" />
          <span>Saved locally</span>
        </div>
      </div>
    );
  }

  // Just went offline - YouTube-style banner
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-zinc-800 text-white transition-all duration-300 animate-slide-down border-b border-zinc-700"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span>You&apos;re offline. Viewing cached data.</span>
      </div>
    );
  }

  // Syncing indicator
  if (isProcessing && pendingCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-blue-600 text-white transition-all duration-300 animate-slide-down"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
      </div>
    );
  }

  // Back online message - YouTube-style confirmation
  if (showBanner && isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-emerald-600 text-white animate-slide-down transition-all duration-300"
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
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-red-600 text-white transition-all duration-300 animate-slide-down"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <AlertCircle className="w-4 h-4" />
        <span>{failedCount} change{failedCount !== 1 ? 's' : ''} couldn&apos;t sync. Tap to retry.</span>
      </div>
    );
  }

  // Poor connection warning (brief, auto-dismiss)
  if (showPoorConnectionWarning && quality === 'poor') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-zinc-800 text-white transition-all duration-300 animate-slide-down border-b border-zinc-700"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
        }}
      >
        <SignalLow className="w-4 h-4 text-amber-400" />
        <span>Slow connection. Using cached data.</span>
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
