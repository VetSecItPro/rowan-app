'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Bell, Shield, Check, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';

interface MarketingPreferences {
  emailMarketing: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
  promotionalOffers: boolean;
}

interface ContactInfo {
  email: string;
  name: string;
}

interface SubscriptionHistory {
  notification_type: string;
  created_at: string;
}

interface MarketingPreferencesData {
  preferences: MarketingPreferences;
  contactInfo: ContactInfo;
  subscriptionHistory: SubscriptionHistory[];
  unsubscribeLinks: {
    email: string;
    all: string;
  };
}

export function MarketingPreferences() {
  const { user } = useAuth();
  const [data, setData] = useState<MarketingPreferencesData | null>(null);
  const [preferences, setPreferences] = useState<MarketingPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMarketingData();
    }
  }, [user]);

  const loadMarketingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/privacy/marketing-subscription', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load marketing preferences');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load preferences');
      }

      setData(result.data);
      setPreferences(result.data.preferences);
    } catch (error) {
      console.error('Error loading marketing data:', error);
      setError('Failed to load marketing preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<MarketingPreferences>) => {
    if (!preferences) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/privacy/marketing-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update preferences');
      }

      setPreferences(prev => ({ ...prev!, ...updates }));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setError('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof MarketingPreferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading marketing preferences...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMarketingData}
          className="mt-3"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || !preferences) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Marketing Preferences
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Control how we communicate with you about updates and offers
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
            Marketing preferences updated successfully
          </span>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Contact Information */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">{data.contactInfo.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 text-gray-500">👤</span>
            <span className="text-gray-700 dark:text-gray-300">{data.contactInfo.name}</span>
          </div>
        </div>
      </div>

      {/* Email Marketing */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Rowan Email Updates</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Receive product updates, tips, and occasional offers directly from Rowan
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                From Rowan only • Never shared with third parties • CAN-SPAM compliant • Unsubscribe anytime
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emailMarketing}
              onChange={(e) => handleToggle('emailMarketing', e.target.checked)}
              disabled={isSaving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>


      {/* Unsubscribe Links */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Quick Unsubscribe</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
              Use these direct links to unsubscribe without logging in
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={data.unsubscribeLinks.email}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Unsubscribe Email
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
              <a
                href={data.unsubscribeLinks.all}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Unsubscribe All
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription History */}
      {data.subscriptionHistory.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {data.subscriptionHistory.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.notification_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Notice */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <div className="flex items-start gap-2">
          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Our Email Privacy Promise</p>
            <p>
              Your email is used only by Rowan for our own communications - we never sell, rent, or share your email with third parties.
              You can update these settings anytime. Security alerts and account notifications will continue regardless of marketing preferences.
              All emails include one-click unsubscribe links as required by law.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}