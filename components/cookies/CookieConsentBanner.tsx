'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  hasUserMadeCookieChoice,
  updateCookiePreferences,
} from '@/lib/utils/cookies';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show informational notice if user hasn't acknowledged essential cookies
    if (!hasUserMadeCookieChoice()) {
      setIsVisible(true);
    }
  }, []);

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

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  🍪 Essential Cookies Only
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Rowan only uses essential cookies required for login, security, and core app functionality.
                  No tracking, advertising, or third-party cookies.
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
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