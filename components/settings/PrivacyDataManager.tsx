// Privacy & Data Manager Component
// Handles all privacy preferences and data management functionality

'use client';

import { useState, useEffect } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  Eye,
  Shield,
  Database,
  Download,
  Trash2,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type {
  UserPrivacyPreferences,
  DeletionWorkflowStatus,
  ExportWorkflowStatus,
} from '@/lib/types/privacy';
import { CookiePreferences } from '@/components/cookies/CookiePreferences';
import { MarketingPreferences } from '@/components/settings/MarketingPreferences';

export function PrivacyDataManager() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPrivacyPreferences | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<DeletionWorkflowStatus | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportWorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prefsRes, deletionRes, exportRes] = await Promise.all([
        fetch('/api/privacy/preferences'),
        fetch('/api/privacy/account-deletion'),
        fetch('/api/privacy/data-export'),
      ]);

      // Load preferences
      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        if (prefsData.success) {
          setPreferences(prefsData.data);
        }
      }

      // Load deletion status
      if (deletionRes.ok) {
        const deletionData = await deletionRes.json();
        if (deletionData.success) {
          setDeletionStatus(deletionData.data);
        }
      }

      // Load export status
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        if (exportData.success) {
          setExportStatus(exportData.data);
        }
      }
    } catch (error) {
      console.error('Error loading privacy data:', error);
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof UserPrivacyPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      setSaving(key);
      setError(null);

      // Optimistically update UI
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);

      const response = await fetch('/api/privacy/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      const result = await response.json();

      if (!result.success) {
        // Revert on failure
        setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
        setError(result.error || 'Failed to update preference');
      } else {
        setSuccess('Privacy preference updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      // Revert on error
      setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
      setError('Failed to update preference');
    } finally {
      setSaving(null);
    }
  };

  const requestDataExport = async () => {
    try {
      setSaving('export');
      setError(null);

      const response = await fetch('/api/privacy/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Data export requested. You will receive an email when ready.');
        await loadAllData(); // Refresh status
      } else {
        setError(result.error || 'Failed to request data export');
      }
    } catch (error) {
      setError('Failed to request data export');
    } finally {
      setSaving(null);
    }
  };

  const requestAccountDeletion = async () => {
    if (!confirm('Are you sure you want to delete your account? This action will start a 30-day grace period.')) {
      return;
    }

    try {
      setSaving('deletion');
      setError(null);

      const response = await fetch('/api/privacy/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested deletion' }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Account deletion requested. Check your email for confirmation.');
        await loadAllData(); // Refresh status
      } else {
        setError(result.error || 'Failed to request account deletion');
      }
    } catch (error) {
      setError('Failed to request account deletion');
    } finally {
      setSaving(null);
    }
  };

  const cancelAccountDeletion = async () => {
    try {
      setSaving('cancel-deletion');
      setError(null);

      const response = await fetch('/api/privacy/account-deletion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User cancelled deletion' }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Account deletion cancelled successfully.');
        await loadAllData(); // Refresh status
      } else {
        setError(result.error || 'Failed to cancel account deletion');
      }
    } catch (error) {
      setError('Failed to cancel account deletion');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Failed to load privacy settings</p>
        <button
          onClick={loadAllData}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy & Data Management
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Control your privacy preferences, manage your data, and understand your rights
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Personal Privacy Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Personal Privacy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Control how you appear to other space members</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Activity Status</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Show when you're online to space members</p>
            </div>
            <Toggle
              id="activity-status"
              checked={preferences.activity_status_visible}
              onChange={(value) => updatePreference('activity_status_visible', value)}
              disabled={saving === 'activity_status_visible'}
              size="md"
              color="purple"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Anonymous Usage Data</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Help improve Rowan with anonymous analytics</p>
            </div>
            <Toggle
              id="anonymous-analytics"
              checked={preferences.share_anonymous_analytics}
              onChange={(value) => updatePreference('share_anonymous_analytics', value)}
              disabled={saving === 'share_anonymous_analytics'}
              size="md"
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Legal Compliance Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Legal Compliance</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">CCPA, GDPR and marketing preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* CCPA Do Not Sell */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">CCPA: Do Not Sell My Personal Information</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Prevent sharing your data with third parties for monetary gain</p>
              </div>
              <Toggle
                id="ccpa-do-not-sell"
                checked={preferences.ccpa_do_not_sell}
                onChange={(value) => updatePreference('ccpa_do_not_sell', value)}
                disabled={saving === 'ccpa_do_not_sell'}
                size="md"
                color="orange"
              />
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
              <strong>California residents:</strong> When enabled, we will not share your personal information with third parties for monetary or other valuable consideration.
            </div>
          </div>

          {/* Marketing Communications */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Marketing Communications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Product updates and promotional emails</p>
                </div>
                <Toggle
                  id="marketing-emails"
                  checked={preferences.marketing_emails_enabled}
                  onChange={(value) => updatePreference('marketing_emails_enabled', value)}
                  disabled={saving === 'marketing_emails_enabled'}
                  size="md"
                  color="purple"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Marketing SMS</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Promotional text messages</p>
                </div>
                <Toggle
                  id="marketing-sms"
                  checked={preferences.marketing_sms_enabled}
                  onChange={(value) => updatePreference('marketing_sms_enabled', value)}
                  disabled={saving === 'marketing_sms_enabled'}
                  size="md"
                  color="purple"
                />
              </div>
            </div>
          </div>

          {/* Cookie Preferences */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Cookie Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Analytics Cookies</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Help us understand how you use our service</p>
                </div>
                <Toggle
                  id="analytics-cookies"
                  checked={preferences.analytics_cookies_enabled}
                  onChange={(value) => updatePreference('analytics_cookies_enabled', value)}
                  disabled={saving === 'analytics_cookies_enabled'}
                  size="md"
                  color="purple"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Performance Cookies</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Improve site performance and user experience</p>
                </div>
                <Toggle
                  id="performance-cookies"
                  checked={preferences.performance_cookies_enabled}
                  onChange={(value) => updatePreference('performance_cookies_enabled', value)}
                  disabled={saving === 'performance_cookies_enabled'}
                  size="md"
                  color="purple"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Advertising Cookies</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Personalized advertising and recommendations</p>
                </div>
                <Toggle
                  id="advertising-cookies"
                  checked={preferences.advertising_cookies_enabled}
                  onChange={(value) => updatePreference('advertising_cookies_enabled', value)}
                  disabled={saving === 'advertising_cookies_enabled'}
                  size="md"
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Your Data</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Export, delete, or manage your personal data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Data */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Export Your Data</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Download all your personal data</p>
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mb-4">
              Includes your profile, tasks, messages, calendar events, and all personal data. You'll receive an email when your export is ready.
            </div>
            {exportStatus?.hasActiveRequest ? (
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                Status: {exportStatus.status} - Check your email for updates
              </div>
            ) : null}
            <button
              onClick={requestDataExport}
              disabled={saving === 'export' || exportStatus?.hasActiveRequest}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving === 'export' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exportStatus?.hasActiveRequest ? 'Export In Progress' : 'Request Data Export'}
            </button>
          </div>

          {/* Delete Account */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Delete Account</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Permanently delete your account</p>
              </div>
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mb-4">
              <strong>Important:</strong> Account deletion has a 30-day grace period. You'll receive email reminders and can cancel anytime before the final deletion.
            </div>
            {deletionStatus?.hasActiveRequest ? (
              <div className="mb-4">
                <div className="text-xs text-red-700 dark:text-red-300 mb-2">
                  Scheduled deletion: {deletionStatus.scheduledDate ? new Date(deletionStatus.scheduledDate).toLocaleDateString() : 'Unknown'}
                </div>
                <button
                  onClick={cancelAccountDeletion}
                  disabled={saving === 'cancel-deletion'}
                  className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving === 'cancel-deletion' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Cancel Deletion
                </button>
              </div>
            ) : (
              <button
                onClick={requestAccountDeletion}
                disabled={saving === 'deletion'}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving === 'deletion' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Request Account Deletion
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cookie Preferences */}
      <CookiePreferences />

      {/* Marketing Preferences */}
      <MarketingPreferences />

      {/* Collaboration Notice */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="text-sm text-green-800 dark:text-green-200">
            <p className="font-medium mb-1">Collaboration-First Design</p>
            <p className="text-xs">
              Rowan is built for family and team collaboration. Your profile, read receipts, and shared activities are always visible to space members to ensure effective coordination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}