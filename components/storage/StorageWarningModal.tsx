'use client';

/**
 * Storage Warning Modal
 * Elegant, non-aggressive notification when storage reaches 80%, 90%, or 100%
 */

import { AlertCircle, HardDrive, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { WarningType } from '@/lib/services/storage-service';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

interface StorageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  warningType: WarningType;
  message: string;
  percentageUsed: number;
  onDismiss: () => Promise<void>;
}

/** Displays a warning modal when storage usage approaches the plan limit. */
export function StorageWarningModal({
  isOpen,
  onClose,
  warningType: _warningType,
  message,
  percentageUsed,
  onDismiss,
}: StorageWarningModalProps) {
  const router = useRouter();
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
      onClose();
    } catch (error) {
      logger.error('Failed to dismiss warning:', error, { component: 'StorageWarningModal', action: 'component_action' });
    } finally {
      setIsDismissing(false);
    }
  };

  const handleManageStorage = () => {
    router.push('/settings/data');
    onClose();
  };

  // Determine color scheme based on severity
  const getColorClasses = () => {
    if (percentageUsed >= 100) {
      return {
        bg: 'bg-red-900/20',
        border: 'border-red-800',
        icon: 'text-red-400',
        accent: 'text-red-300',
        button: 'bg-red-600 hover:bg-red-700',
        gradient: 'bg-red-600',
      };
    } else if (percentageUsed >= 90) {
      return {
        bg: 'bg-orange-900/20',
        border: 'border-orange-800',
        icon: 'text-orange-400',
        accent: 'text-orange-300',
        button: 'bg-orange-600 hover:bg-orange-700',
        gradient: 'bg-orange-600',
      };
    } else {
      return {
        bg: 'bg-amber-900/20',
        border: 'border-amber-800',
        icon: 'text-amber-400',
        accent: 'text-amber-300',
        button: 'bg-amber-600 hover:bg-amber-700',
        gradient: 'bg-amber-600',
      };
    }
  };

  const colors = getColorClasses();

  const getTitle = () => {
    if (percentageUsed >= 100) return 'Storage Full';
    if (percentageUsed >= 90) return 'Storage Almost Full';
    return 'Storage Running Low';
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={handleDismiss}
        disabled={isDismissing}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDismissing ? 'Dismissing...' : 'Dismiss'}
      </button>
      <button
        onClick={handleManageStorage}
        className={`flex-1 px-6 py-3 ${colors.button} text-white rounded-full transition-colors font-medium`}
      >
        Manage Storage
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      maxWidth="md"
      headerGradient={colors.gradient}
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Icon & Message */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full ${colors.bg}`}>
            {percentageUsed >= 100 ? (
              <AlertCircle className={`w-6 h-6 ${colors.icon}`} />
            ) : (
              <HardDrive className={`w-6 h-6 ${colors.icon}`} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">{message}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Storage Used</span>
            <span className={`font-semibold ${colors.accent}`}>
              {Math.round(percentageUsed)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${colors.gradient}`}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* Help Text */}
        <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
          <p className="text-sm text-gray-300">
            <Settings className="w-4 h-4 inline mr-2" />
            You can manage your files and free up space in your Data Management settings.
          </p>
        </div>
      </div>
    </Modal>
  );
}
