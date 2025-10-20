'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Mail, Clock, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';

interface DigestPreferences {
  digest_enabled: boolean;
  digest_time: string;
  timezone: string;
}

export default function DigestSettingsPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DigestPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDigestPreferences();
    }
  }, [user]);

  const loadDigestPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/digest/preferences', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to load digest preferences');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load preferences');
      }

      setPreferences(result.data);
    } catch (error) {
      console.error('Error loading digest preferences:', error);
      setError('Failed to load digest preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDigestEnabled = async (enabled: boolean) => {
    if (!preferences) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/digest/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ digest_enabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update digest preference');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update preference');
      }

      setPreferences(prev => ({ ...prev!, digest_enabled: enabled }));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating digest preference:', error);
      setError('Failed to update digest preference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDigest = (enabled: boolean) => {
    updateDigestEnabled(enabled);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading digest preferences...</span>
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
            <button
              onClick={loadDigestPreferences}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link
            href="/settings"
            className="btn-touch inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-4 rounded-md active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Digest
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Get a personalized AI-powered summary of your day delivered each morning
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Success Message */}
          {showSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Daily Digest preference updated successfully
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Main Digest Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Daily Digest {preferences.digest_enabled ? 'is Active' : 'is Disabled'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {preferences.digest_enabled
                    ? "You'll receive a personalized AI-powered summary of your day delivered to your email every morning."
                    : "Enable Daily Digest to receive a personalized AI-powered summary of your day delivered to your email every morning."
                  }
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Delivery Schedule</span>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  Your digest arrives every day at <strong>7:00 AM Eastern Time</strong> (12:00 PM UTC) with fresh, relevant content for your day.
                </p>
              </div>

              {/* Digest Opt-in Toggle */}
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
                      Enable Daily Digest
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Choose whether you want to receive daily digest emails. You can change this setting at any time.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.digest_enabled}
                      onChange={(e) => handleToggleDigest(e.target.checked)}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    {isSaving && (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600 ml-2" />
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What's Included in Your Daily Digest
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Tasks due today
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Upcoming events
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Shopping lists
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Meal planning
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Overdue items
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                Priority reminders
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              How it works
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your digest is generated fresh each morning using AI</li>
              <li>• Only includes items that are relevant for your day</li>
              <li>• Automatically prioritizes urgent and overdue items</li>
              <li>• Clean, mobile-friendly format for easy reading</li>
              <li>• Delivered consistently at 7:00 AM Eastern every day</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Need help or have feedback?
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              If you're not receiving your digest or want to provide feedback, please reach out to our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}