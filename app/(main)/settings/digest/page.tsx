'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Mail, Clock, Save, ArrowLeft, CheckCircle } from 'lucide-react';
// Remove the old service import - we'll use API calls directly
interface DigestPreferences {
  id: string;
  user_id: string;
  digest_enabled: boolean;
  digest_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}
import { useAuth } from '@/lib/contexts/auth-context';
import { Toggle } from '@/components/ui/Toggle';
import Link from 'next/link';

export default function DigestSettingsPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DigestPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState('07:00:00');
  const [timezone, setTimezone] = useState('America/New_York');

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await fetch('/api/digest/preferences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const prefs = result.data;
            setPreferences(prefs);
            setDigestEnabled(prefs.digest_enabled ?? true);
            setDigestTime(prefs.digest_time ?? '07:00:00');
            setTimezone(prefs.timezone ?? 'America/New_York');
          }
        } else {
          console.error('Failed to fetch digest preferences:', response.status);
        }
      } catch (error) {
        console.error('Error fetching digest preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  // Auto-detect timezone on first load
  useEffect(() => {
    if (!preferences && !loading) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);
    }
  }, [preferences, loading]);

  // Save preferences
  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const response = await fetch('/api/digest/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digest_enabled: digestEnabled,
          digest_time: digestTime,
          timezone: timezone,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccessMessage('Digest preferences saved successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          throw new Error(result.message || 'Failed to save preferences');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving digest preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Test digest
  const handleTestDigest = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/cron/daily-digest?action=trigger', {
        method: 'GET',
      });

      if (response.ok) {
        alert('Test digest sent! Check your inbox in a few moments.');
      } else {
        throw new Error('Failed to send test digest');
      }
    } catch (error) {
      console.error('Error sending test digest:', error);
      alert('Failed to send test digest. Please try again.');
    }
  };

  const timeOptions = [
    { value: '06:00:00', label: '6:00 AM' },
    { value: '07:00:00', label: '7:00 AM' },
    { value: '08:00:00', label: '8:00 AM' },
    { value: '09:00:00', label: '9:00 AM' },
    { value: '10:00:00', label: '10:00 AM' },
  ];

  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'UTC', label: 'UTC' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

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
                Get a personalized summary of your day delivered each morning
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200 text-sm font-medium">
              {successMessage}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Main Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Enable Daily Digest
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receive a personalized email summary of your tasks, events, and reminders each morning
                  </p>
                </div>
                <Toggle
                  id="digest-enabled"
                  checked={digestEnabled}
                  onChange={setDigestEnabled}
                  size="lg"
                  color="purple"
                />
              </div>

              {digestEnabled && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Delivery Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Delivery Time
                        </label>
                        <select
                          value={digestTime}
                          onChange={(e) => setDigestTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {timeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Your local time
                        </p>
                      </div>

                      {/* Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {commonTimezones.map(tz => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Auto-detected from your browser
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Preview Card */}
          {digestEnabled && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                What's Included
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
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !user}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>

            {digestEnabled && (
              <button
                onClick={handleTestDigest}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Test Digest
              </button>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              How it works
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your digest is generated fresh each morning using AI</li>
              <li>• Only includes items that are relevant for your day</li>
              <li>• Automatically prioritizes urgent and overdue items</li>
              <li>• Clean, mobile-friendly format for easy reading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}