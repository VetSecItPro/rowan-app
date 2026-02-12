// Privacy & Data Manager Component
// Handles all privacy preferences and data management functionality

'use client';

import { useState, useEffect } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Shield,
  Database,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type {
  UserPrivacyPreferences,
  DeletionWorkflowStatus,
  ExportWorkflowStatus,
} from '@/lib/types/privacy';

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
      logger.error('Error loading privacy data:', error, { component: 'PrivacyDataManager', action: 'component_action' });
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

      const response = await csrfFetch('/api/privacy/preferences', {
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
    } catch {
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

      const response = await csrfFetch('/api/privacy/data-export', {
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
    } catch {
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

      const response = await csrfFetch('/api/privacy/account-deletion', {
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
    } catch {
      setError('Failed to request account deletion');
    } finally {
      setSaving(null);
    }
  };

  const cancelAccountDeletion = async () => {
    try {
      setSaving('cancel-deletion');
      setError(null);

      const response = await csrfFetch('/api/privacy/account-deletion', {
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
    } catch {
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
        <AlertCircle aria-hidden="true" className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-400">Failed to load privacy settings</p>
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
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Privacy & Data Management
        </h2>
        <p className="text-sm sm:text-base text-gray-400">
          Control your privacy preferences, manage your data, and understand your rights
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-900/20 border border-green-800 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle aria-hidden="true" className="w-4 h-4 text-green-400" />
            <p className="text-sm text-green-200">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      )}


      {/* Legal Compliance Section */}
      <div className="bg-gray-800/40 border border-gray-700/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Privacy Rights</h3>
            <p className="text-sm text-gray-400">CCPA and GDPR privacy controls</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* CCPA Do Not Sell */}
          <div className={`p-4 border border-orange-800 rounded-xl ${
            preferences.ccpa_do_not_sell
              ? 'bg-gray-900/20'
              : 'bg-orange-900/20'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-white">CCPA: Do Not Sell My Personal Information</p>
                <p className="text-xs text-gray-400 mt-1">Prevent sharing your data with third parties for monetary gain</p>
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
            <div className="text-xs text-orange-300 bg-orange-900/30 p-3 rounded-lg">
              <strong>California residents:</strong> When enabled, we will not share your personal information with third parties for monetary or other valuable consideration.
            </div>
          </div>

        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-gray-800/40 border border-gray-700/20 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Your Data</h3>
            <p className="text-sm text-gray-400">Export, delete, or manage your personal data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Data */}
          <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <Download className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Export Your Data</h4>
                <p className="text-xs text-gray-400 mt-1">Download all your personal data</p>
              </div>
            </div>
            <div className="text-xs text-blue-300 bg-blue-900/30 p-3 rounded-lg mb-4">
              Includes your profile, tasks, messages, calendar events, and all personal data. You&apos;ll receive an email when your export is ready.
            </div>
            {exportStatus?.hasActiveRequest ? (
              <div className="text-xs text-blue-300 mb-4">
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
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">Delete Account</h4>
                <p className="text-xs text-gray-400 mt-1">Permanently delete your account</p>
              </div>
            </div>
            <div className="text-xs text-red-300 bg-red-900/30 p-3 rounded-lg mb-4">
              <strong>Important:</strong> Account deletion has a 30-day grace period. You&apos;ll receive email reminders and can cancel anytime before the final deletion.
            </div>
            {deletionStatus?.hasActiveRequest ? (
              <div className="mb-4">
                <div className="text-xs text-red-300 mb-2">
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

    </div>
  );
}
