'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import {
  hasUserMadeCookieChoice,
  updateCookiePreferences,
} from '@/lib/utils/cookies';

/** Renders a GDPR-compliant cookie consent banner with accept/reject options. */
export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted to prevent hydration issues
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only check after component is mounted to avoid SSR mismatch
    if (mounted) {
      try {
        if (!hasUserMadeCookieChoice()) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsVisible(true);
        }
      } catch (error) {
        // Silently handle any localStorage errors during SSR
        logger.warn('Cookie consent check failed', { component: 'CookieConsentBanner', error });
      }
    }
  }, [mounted]);

  const handleAcknowledge = () => {
    // Since we only use essential cookies, just acknowledge and dismiss
    const preferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      preferences: false,
    };

    updateCookiePreferences(preferences);
    setIsVisible(false);
  };

  // Don't render during SSR or if not visible
  if (!mounted || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-gray-900 border-t border-gray-700 shadow-lg"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-green-900/20 rounded-lg">
                <Shield className="h-5 w-5 text-green-400" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">
                  🍪 Essential Cookies Only
                </h3>
                <p className="text-sm text-gray-300">
                  Rowan only uses essential cookies required for login, security, and core app functionality.
                  No tracking, advertising, or third-party cookies.
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                data-testid="cookie-consent-accept"
                size="sm"
                onClick={handleAcknowledge}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Got it
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
