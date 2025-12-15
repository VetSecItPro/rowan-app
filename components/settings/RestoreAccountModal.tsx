'use client';

import { useState } from 'react';
import { X, AlertTriangle, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface RestoreAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletionRequestedAt: string;
  permanentDeletionAt: string;
}

export function RestoreAccountModal({
  isOpen,
  onClose,
  deletionRequestedAt,
  permanentDeletionAt,
}: RestoreAccountModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const daysRemaining = Math.ceil(
    (new Date(permanentDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const handleRestoreAccount = async () => {
    setIsRestoring(true);
    setError('');

    try {
      const response = await fetch('/api/user/cancel-deletion', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to restore account');
        setIsRestoring(false);
        return;
      }

      // Account restored successfully
      // Reload the page to refresh the session and UI
      window.location.reload();
    } catch (error) {
      logger.error('Account restoration error:', error, { component: 'RestoreAccountModal', action: 'component_action' });
      setError('An unexpected error occurred. Please try again.');
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Account Marked for Deletion
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            disabled={isRestoring}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                Your account is scheduled for deletion
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                You requested account deletion on{' '}
                <strong>{new Date(deletionRequestedAt).toLocaleDateString()}</strong>.
                Your account will be permanently deleted in{' '}
                <strong className="text-orange-900 dark:text-orange-100">{daysRemaining} days</strong>{' '}
                on <strong>{new Date(permanentDeletionAt).toLocaleDateString()}</strong>.
              </p>
            </div>
          </div>

          {/* What happens if you restore */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Restore your account now
            </h3>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cancel Deletion</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your deletion request will be cancelled immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Full Access Restored</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Continue using Rowan normally with all your data intact.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">No Data Loss</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All your expenses, tasks, messages, and other data will remain available.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              disabled={isRestoring}
            >
              Continue to Dashboard
            </button>
            <button
              onClick={handleRestoreAccount}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Restoring Account...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Restore My Account
                </>
              )}
            </button>
          </div>

          {/* Info Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By restoring your account, you confirm that you want to continue using Rowan.
            You can request deletion again anytime from your account settings.
          </div>
        </div>
      </div>
    </div>
  );
}
