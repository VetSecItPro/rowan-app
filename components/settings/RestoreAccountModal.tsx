'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Calendar, CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { Modal } from '@/components/ui/Modal';

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
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const remaining = Math.ceil(
      (new Date(permanentDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived countdown updates from server data
    setDaysRemaining(remaining);
  }, [permanentDeletionAt]);

  const handleRestoreAccount = async () => {
    setIsRestoring(true);
    setError('');

    try {
      const response = await csrfFetch('/api/user/cancel-deletion', {
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

  const footerContent = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-full font-medium transition-colors"
          disabled={isRestoring}
        >
          Continue to Dashboard
        </button>
        <button
          onClick={handleRestoreAccount}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      <div className="text-xs text-gray-400 text-center">
        By restoring your account, you confirm that you want to continue using Rowan.
        You can request deletion again anytime from your account settings.
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Marked for Deletion"
      maxWidth="2xl"
      headerGradient="bg-orange-500"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Warning Notice */}
        <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-orange-200 mb-1">
              Your account is scheduled for deletion
            </h3>
            <p className="text-sm text-orange-300">
              You requested account deletion on{' '}
              <strong>{new Date(deletionRequestedAt).toLocaleDateString()}</strong>.
              Your account will be permanently deleted in{' '}
              <strong className="text-orange-100">{daysRemaining} days</strong>{' '}
              on <strong>{new Date(permanentDeletionAt).toLocaleDateString()}</strong>.
            </p>
          </div>
        </div>

        {/* What happens if you restore */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Restore your account now
          </h3>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Cancel Deletion</p>
                <p className="text-sm text-gray-400">
                  Your deletion request will be cancelled immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Full Access Restored</p>
                <p className="text-sm text-gray-400">
                  Continue using Rowan normally with all your data intact.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-900/20 border border-purple-800 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">No Data Loss</p>
                <p className="text-sm text-gray-400">
                  All your expenses, tasks, messages, and other data will remain available.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
