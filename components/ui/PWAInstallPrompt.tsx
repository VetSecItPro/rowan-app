'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const VISIT_COUNT_KEY = 'pwa_visit_count';
const DISMISSED_KEY = 'pwa_install_dismissed';
const DISMISSED_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INSTALLED_KEY = 'pwa_installed';
const AUTO_DISMISS_MS = 10_000;
const SHOW_AFTER_VISITS = 3;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Already installed as PWA
    if (isStandalone()) return;
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISSED_DURATION_MS) return;
      localStorage.removeItem(DISMISSED_KEY);
    }

    // Increment visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, visitCount.toString());

    if (visitCount < SHOW_AFTER_VISITS) return;

    // iOS Safari fallback - no beforeinstallprompt event
    if (isIOS()) {
      setShowIOSInstructions(true);
      setVisible(true);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
      return;
    }

    // Listen for the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setVisible(true);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  const handleInstall = async () => {
    if (deferredPromptRef.current) {
      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, 'true');
      }
      deferredPromptRef.current = null;
    }
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800/95 p-5 shadow-2xl backdrop-blur-xl">
            {/* Accent gradient bar */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              {/* App icon preview */}
              <div className="flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-semibold text-white">Install Rowan</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">
                  Get the full app experience &mdash; faster loading, offline access, and home screen shortcut.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-3">
              {showIOSInstructions ? (
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-700/50 px-3 py-2.5 text-sm text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    Tap <Share className="inline h-4 w-4 text-blue-400" /> Share
                  </span>
                  <span className="text-gray-500">&rarr;</span>
                  <span className="inline-flex items-center gap-1">
                    <Plus className="inline h-4 w-4 text-blue-400" /> Add to Home Screen
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 active:scale-[0.98]"
                >
                  Install
                </button>
              )}
              <button
                onClick={dismiss}
                className="px-3 py-2.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
