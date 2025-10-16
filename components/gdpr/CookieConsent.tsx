'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'rowan_cookie_consent';
const COOKIE_EXPIRY_DAYS = 365;

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // Set consent cookie
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      expires: expiryDate.toISOString()
    }));

    closeban();
  };

  const closeban = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShow(false);
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Cookie className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">Cookie Notice</h3>
          </div>
          <button
            onClick={closeban}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close cookie notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            We use <strong>essential cookies only</strong> to ensure the app functions properly. We do not use tracking, analytics, or advertising cookies.
          </p>

          {/* Cookie Details */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Functional Cookies</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Authentication, theme preferences, session management</p>
              </div>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-400">Analytics & Tracking</p>
                <p className="text-xs text-gray-600 dark:text-gray-500">Not used - we respect your privacy</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Learn more in our{' '}
            <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept & Continue
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-500">
            By continuing to use Rowan, you agree to our essential cookies
          </p>
        </div>
      </div>
    </div>
  );
}
