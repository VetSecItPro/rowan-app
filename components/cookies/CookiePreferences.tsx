'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cookie, Shield, BarChart3, Megaphone, Settings, Palette, Calendar, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCookiePreferences,
  updateCookiePreferences,
  getCookieConsentTimestamp,
  CookiePreferences as CookiePrefs,
  COOKIE_CATALOG,
  cookieToPrivacyUpdates,
} from '@/lib/utils/cookies';
import { updatePrivacyPreferences } from '@/lib/services/privacy-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface CookieCategory {
  key: keyof CookiePrefs;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  required?: boolean;
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    key: 'necessary',
    title: 'Essential Cookies',
    description: 'Required for login, security, and core app functionality',
    icon: Shield,
    color: 'green',
    required: true,
  },
];

export function CookiePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CookiePrefs>(getCookiePreferences());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLastUpdated(getCookieConsentTimestamp());
  }, []);

  const handlePreferenceChange = (category: keyof CookiePrefs, enabled: boolean) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies

    setPreferences(prev => ({
      ...prev,
      [category]: enabled,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Update cookie preferences locally
      updateCookiePreferences(preferences);

      // Sync with privacy preferences if user is authenticated
      if (user) {
        const privacyUpdates = cookieToPrivacyUpdates(preferences);
        await updatePrivacyPreferences(user.id, privacyUpdates);
      }

      setLastUpdated(new Date());
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving cookie preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: true,
      preferences: true,
    });
  };

  const getColorClasses = (color: string, enabled: boolean) => {
    const colors = {
      green: enabled ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
      blue: enabled ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
      purple: enabled ? 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300' : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
      emerald: enabled ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
      orange: enabled ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
      gray: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
          <Cookie className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cookie Information
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Rowan only uses essential cookies required for the app to function
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
        >
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Cookie preferences updated successfully
          </span>
        </motion.div>
      )}

      {/* Cookie Categories */}
      <div className="space-y-4">
        {COOKIE_CATEGORIES.map(category => {
          const Icon = category.icon;
          const enabled = preferences[category.key];
          const isRequired = category.required;

          return (
            <div
              key={category.key}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                getColorClasses(category.color, enabled)
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{category.title}</h4>
                      {isRequired && (
                        <span className="text-xs px-2 py-1 bg-white/70 dark:bg-gray-900/70 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm opacity-90">{category.description}</p>
                  </div>
                </div>

                <div className="ml-4">
                  {isRequired ? (
                    <div className="flex items-center gap-2 text-sm opacity-75">
                      <AlertCircle className="h-4 w-4" />
                      Always Active
                    </div>
                  ) : (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handlePreferenceChange(category.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/30 dark:peer-focus:ring-blue-800/30 rounded-full peer dark:bg-gray-700/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cookie Information */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          What Cookies We Use
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Session & Authentication</span>
              <p className="text-gray-600 dark:text-gray-300">Keeps you logged in securely</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Security & CSRF Protection</span>
              <p className="text-gray-600 dark:text-gray-300">Protects against malicious attacks</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">App Functionality</span>
              <p className="text-gray-600 dark:text-gray-300">Remembers your settings and preferences</p>
            </div>
          </div>
        </div>
      </div>


      {/* Legal Notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Simple Cookie Policy</p>
            <p>
              Rowan only uses essential cookies necessary for the app to function. No tracking, advertising, or third-party cookies.
              These cookies are required and cannot be disabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}