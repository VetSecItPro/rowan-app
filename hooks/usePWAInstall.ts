'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDevice } from '@/lib/contexts/DeviceContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  /** Whether the app can be installed (install prompt available or iOS share sheet) */
  isInstallable: boolean;
  /** Whether the app is already installed (running in standalone mode) */
  isInstalled: boolean;
}

/**
 * Hook for managing PWA installation.
 *
 * Platform detection (isIOS, isAndroid, isMobile, isStandalone) is delegated
 * to the DeviceContext for consistency across the app.
 *
 * This hook manages PWA-specific functionality:
 * - Detecting if install prompt is available
 * - Triggering the install prompt
 * - Tracking installation state
 *
 * @example
 * ```tsx
 * const { isInstalled, isIOS, canPrompt, promptInstall } = usePWAInstall();
 *
 * if (isInstalled) return null;
 *
 * return canPrompt ? (
 *   <button onClick={promptInstall}>Install App</button>
 * ) : isIOS ? (
 *   <p>Use Safari's Share menu to install</p>
 * ) : null;
 * ```
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
  });

  // Get platform detection from DeviceContext
  const { isIOS, isAndroid, isMobile, isStandalone } = useDevice();

  useEffect(() => {
    // Update installed state based on standalone mode from device context
    queueMicrotask(() => {
      setState(prev => ({
        ...prev,
        isInstalled: isStandalone,
        // iOS doesn't support beforeinstallprompt but can still install
        isInstallable: isIOS && !isStandalone,
      }));
    });

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({
        ...prev,
        isInstallable: true,
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, isStandalone]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { success: false, outcome: 'no-prompt' as const };
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState(prev => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
        }));
      }

      return { success: true, outcome };
    } catch (error) {
      console.error('Error prompting install:', error);
      return { success: false, outcome: 'error' as const };
    }
  }, [deferredPrompt]);

  return {
    ...state,
    // Platform detection from DeviceContext (for backwards compatibility)
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    // PWA-specific functionality
    promptInstall,
    canPrompt: !!deferredPrompt,
  };
}
