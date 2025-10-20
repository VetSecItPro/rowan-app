'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  hasUserMadeCookieChoice,
  updateCookiePreferences,
  getDefaultCookiePreferences,
  getCookiePreferences,
  CookiePreferences,
  COOKIE_CATALOG
} from '@/lib/utils/cookies';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [customPreferences, setCustomPreferences] = useState<CookiePreferences>(getDefaultCookiePreferences());

  useEffect(() => {
    // Show banner if user hasn't made a choice
    if (!hasUserMadeCookieChoice()) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const preferences: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      preferences: true,
    };

    updateCookiePreferences(preferences);
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    const preferences = getDefaultCookiePreferences();
    updateCookiePreferences(preferences);
    setIsVisible(false);
  };

  const handleCustomize = () => {
    setShowDetails(true);
    setCustomPreferences(getCookiePreferences());
  };

  const handleSaveCustom = () => {
    updateCookiePreferences(customPreferences);
    setIsVisible(false);
  };

  const updateCustomPreference = (category: keyof CookiePreferences, enabled: boolean) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies

    setCustomPreferences(prev => ({
      ...prev,
      [category]: enabled,
    }));
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
        <div className="max-w-6xl mx-auto">
          {!showDetails ? (
            // Simple consent banner
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    🍪 We use cookies to improve your experience
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    We use necessary cookies for core functionality and optional cookies for analytics and personalization.
                    You can customize your preferences or accept our recommended settings.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomize}
                  className="w-full sm:w-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAcceptNecessary}
                  className="w-full sm:w-auto"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Necessary Only
                </Button>

                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            // Detailed preferences
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cookie Preferences
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {/* Necessary Cookies */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Necessary Cookies
                      </h4>
                    </div>
                    <div className="text-sm text-green-600 font-medium">Always Active</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Essential cookies for authentication, security, and core functionality. These cannot be disabled.
                  </p>
                  <div className="space-y-1">
                    {COOKIE_CATALOG.filter(cookie => cookie.category === 'necessary').map(cookie => (
                      <div key={cookie.name} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cookie.name}</span> - {cookie.purpose}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-blue-600 rounded"></div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Analytics Cookies
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customPreferences.analytics}
                        onChange={(e) => updateCustomPreference('analytics', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Help us understand how you use our app to improve performance and user experience.
                  </p>
                  <div className="space-y-1">
                    {COOKIE_CATALOG.filter(cookie => cookie.category === 'analytics').map(cookie => (
                      <div key={cookie.name} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cookie.name}</span> - {cookie.purpose}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-purple-600 rounded"></div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Marketing Cookies
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customPreferences.marketing}
                        onChange={(e) => updateCustomPreference('marketing', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Used for advertising personalization and measuring campaign effectiveness.
                  </p>
                  <div className="space-y-1">
                    {COOKIE_CATALOG.filter(cookie => cookie.category === 'marketing').map(cookie => (
                      <div key={cookie.name} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cookie.name}</span> - {cookie.purpose}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-green-600 rounded"></div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Functional Cookies
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customPreferences.functional}
                        onChange={(e) => updateCustomPreference('functional', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Enable enhanced features like remembering your preferences and providing personalized content.
                  </p>
                  <div className="space-y-1">
                    {COOKIE_CATALOG.filter(cookie => cookie.category === 'functional').map(cookie => (
                      <div key={cookie.name} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cookie.name}</span> - {cookie.purpose}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preference Cookies */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-orange-600 rounded"></div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Preference Cookies
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customPreferences.preferences}
                        onChange={(e) => updateCustomPreference('preferences', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Remember your language, timezone, and other personalization settings.
                  </p>
                  <div className="space-y-1">
                    {COOKIE_CATALOG.filter(cookie => cookie.category === 'preferences').map(cookie => (
                      <div key={cookie.name} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{cookie.name}</span> - {cookie.purpose}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleAcceptNecessary}
                  className="w-full sm:w-auto"
                >
                  Accept Necessary Only
                </Button>
                <Button
                  onClick={handleSaveCustom}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}