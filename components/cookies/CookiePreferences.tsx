'use client';

import { useState } from 'react';
import { Cookie, Shield, AlertCircle } from 'lucide-react';
import {
  getCookiePreferences,
  CookiePreferences as CookiePrefs,
} from '@/lib/utils/cookies';

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

/** Provides granular cookie preference controls for different tracking categories. */
export function CookiePreferences() {
  const [preferences, setPreferences] = useState<CookiePrefs>(getCookiePreferences());

  const handlePreferenceChange = (category: keyof CookiePrefs, enabled: boolean) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies

    setPreferences(prev => ({
      ...prev,
      [category]: enabled,
    }));
  };

  const getColorClasses = (color: string, enabled: boolean) => {
    const colors = {
      green: enabled ? 'bg-green-900/20 border-green-700 text-green-300' : 'bg-gray-800 border-gray-600 text-gray-400',
      blue: enabled ? 'bg-blue-900/20 border-blue-700 text-blue-300' : 'bg-gray-800 border-gray-600 text-gray-400',
      purple: enabled ? 'bg-purple-900/20 border-purple-700 text-purple-300' : 'bg-gray-800 border-gray-600 text-gray-400',
      emerald: enabled ? 'bg-emerald-900/20 border-emerald-700 text-emerald-300' : 'bg-gray-800 border-gray-600 text-gray-400',
      orange: enabled ? 'bg-orange-900/20 border-orange-700 text-orange-300' : 'bg-gray-800 border-gray-600 text-gray-400',
      gray: 'bg-gray-800 border-gray-600 text-gray-400',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-900/20 rounded-lg">
          <Cookie className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Cookie Information
          </h3>
          <p className="text-sm text-gray-300">
            Rowan only uses essential cookies required for the app to function
          </p>
        </div>
      </div>

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
                  <div className="p-2 bg-gray-900/50 rounded-lg">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{category.title}</h4>
                      {isRequired && (
                        <span className="text-xs px-2 py-1 bg-gray-900/70 rounded-full">
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
                      <div className="w-11 h-6 bg-white/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/30 peer-focus:ring-blue-800/30 rounded-full peer bg-gray-700/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cookie Information */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h4 className="font-medium text-white mb-3">
          What Cookies We Use
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-white">Session & Authentication</span>
              <p className="text-gray-300">Keeps you logged in securely</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-white">Security & CSRF Protection</span>
              <p className="text-gray-300">Protects against malicious attacks</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
            <div>
              <span className="font-medium text-white">App Functionality</span>
              <p className="text-gray-300">Remembers your settings and preferences</p>
            </div>
          </div>
        </div>
      </div>


      {/* Legal Notice */}
      <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-300">
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
