'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Network Status Indicator
 *
 * Shows a banner when the user loses network connectivity.
 * Automatically dismisses when connection is restored.
 * Uses the Navigator.onLine API with event listeners for reliability.
 */
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" message briefly if we were offline
      if (wasOffline) {
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 3000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Don't show banner if online and wasn't just restored
  if (isOnline && !showBanner) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 safe-area-inset-top ${
        isOnline
          ? 'bg-green-500 text-white animate-slide-down'
          : 'bg-red-500 text-white'
      }`}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
      }}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>You're back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>No internet connection</span>
        </>
      )}
    </div>
  );
}
