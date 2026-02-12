'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/** localStorage key used to track when the user last dismissed the banner */
const DISMISS_KEY = 'pwa-install-dismissed';

/** Number of milliseconds in 7 days */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad/.test(ua);
  const isChromeIOS = /CriOS/.test(ua);
  const isFirefoxIOS = /FxiOS/.test(ua);
  return isIOS && !isChromeIOS && !isFirefoxIOS;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const matchesStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone = (navigator as unknown as { standalone?: boolean }).standalone;
  return matchesStandalone || navigatorStandalone === true;
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const timestamp = parseInt(dismissed, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-text-bottom mx-0.5 text-blue-400"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/**
 * Smart PWA install banner — shows immediately (no delay), adapts to platform.
 * Uses sticky positioning so it doesn't cover the footer.
 * Respects 7-day dismiss cooldown and hides if already installed.
 */
export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, []);

  const handleInstall = useCallback(async () => {
    const event = deferredPromptRef.current;
    if (!event) return;

    await event.prompt();
    const { outcome } = await event.userChoice;

    if (outcome === 'accepted') {
      deferredPromptRef.current = null;
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const ios = isIOSSafari();
    const mobile = isMobileDevice();
    setIsIOS(ios);
    setIsMobile(mobile);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // Show immediately — no delay
    setVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="sticky bottom-0 z-50 md:z-40 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 mb-[env(safe-area-inset-bottom,0px)]"
      role="banner"
      aria-label="Install Rowan app"
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/rowan-logo.png"
            alt="Rowan app icon"
            width={40}
            height={40}
            sizes="40px"
            className="rounded-lg flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Add Rowan to your {isMobile ? 'home screen' : 'desktop'}
            </p>
            {isIOS ? (
              <p className="text-xs text-gray-400 mt-0.5">
                Tap <ShareIcon /> then &ldquo;Add to Home Screen&rdquo;
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                Installs locally, no app store, works offline
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={dismiss}
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4" />
            </button>

            {isIOS ? (
              <Link
                href="/install"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                How to Install
              </Link>
            ) : (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
