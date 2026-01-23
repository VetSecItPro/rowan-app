'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Download, Calendar, Check } from 'lucide-react';
import { accountDeletionService } from '@/lib/services/account-deletion-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDeletionModal({ isOpen, onClose }: AccountDeletionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/user/export-data');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rowan-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setHasExported(true);
    } catch {
      alert('Failed to export data. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      // Call the account deletion service with browser client
      const supabase = createClient();
      const result = await accountDeletionService.deleteUserAccount(user.id, supabase);

      if (!result.success) {
        alert(result.error || 'Failed to delete account. Please try again.');
        setIsDeleting(false);
        return;
      }

      // Account deletion initiated successfully
      // Redirect to goodbye page
      router.push('/goodbye');
    } catch (error) {
      logger.error('Account deletion error:', error, { component: 'AccountDeletionModal', action: 'component_action' });
      alert('An unexpected error occurred. Please try again.');
      setIsDeleting(false);
    }
  };

  const footerContent = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-full font-medium transition-colors"
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteAccount}
          className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={isDeleting}
        >
          {isDeleting ? (
            'Deleting Account...'
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </>
          )}
        </button>
      </div>
      <div className="text-xs text-gray-400 text-center">
        By deleting your account, you acknowledge that this action is irreversible after the 30-day grace period.
        This complies with GDPR Article 17 (Right to Erasure).
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Account"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-red-600 to-red-700"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-200 mb-1">Permanent Account Deletion</h3>
            <p className="text-sm text-red-300">
              This action will permanently delete your account and all associated data. You have a 30-day grace period to cancel this deletion.
            </p>
          </div>
        </div>

        {/* What happens */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">What happens when you delete your account:</h3>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">30-Day Grace Period</p>
                <p className="text-sm text-gray-400">Your account will be marked for deletion but you can cancel anytime within 30 days.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Data Removal</p>
                <p className="text-sm text-gray-400">All your personal data (expenses, tasks, messages, etc.) will be permanently deleted.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
              <Download className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Data Export Recommended</p>
                <p className="text-sm text-gray-400">Download a copy of your data before deletion (GDPR compliance).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Data Section */}
        <div className="border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Export Your Data (Recommended)</h4>
            {hasExported && (
              <div className="flex items-center gap-1 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">Exported</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Download all your data in JSON format before deletion. This includes expenses, budgets, tasks, messages, and more.
          </p>
          <button
            onClick={handleExportData}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All Data
          </button>
        </div>
      </div>
    </Modal>
  );
}