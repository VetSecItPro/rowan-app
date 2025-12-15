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

interface StorageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  warningType: WarningType;
  message: string;
  percentageUsed: number;
  onDismiss: () => Promise<void>;
}

export function StorageWarningModal({
  isOpen,
  onClose,
  warningType,
  message,
  percentageUsed,
  onDismiss,
}: StorageWarningModalProps) {
  const router = useRouter();
  const [isDismissing, setIsDismissing] = useState(false);

  if (!isOpen) return null;

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
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        accent: 'text-red-700 dark:text-red-300',
        button: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
      };
    } else if (percentageUsed >= 90) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'text-orange-600 dark:text-orange-400',
        accent: 'text-orange-700 dark:text-orange-300',
        button: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
      };
    } else {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        accent: 'text-amber-700 dark:text-amber-300',
        button: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close notification"
      />

      {/* Modal Container */}
      <div
        className={`
          relative
          bg-white dark:bg-gray-800
          rounded-2xl
          shadow-2xl
          max-w-md
          w-full
          border-2
          ${colors.border}
          overflow-hidden
          transition-all
          duration-300
          animate-in
          fade-in-0
          zoom-in-95
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className={`h-2 ${colors.button}`} />

        {/* Content */}
        <div className="p-6">
          {/* Icon & Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`flex-shrink-0 p-3 rounded-full ${colors.bg}`}>
              {percentageUsed >= 100 ? (
                <AlertCircle className={`w-6 h-6 ${colors.icon}`} />
              ) : (
                <HardDrive className={`w-6 h-6 ${colors.icon}`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {percentageUsed >= 100
                  ? 'Storage Full'
                  : percentageUsed >= 90
                    ? 'Storage Almost Full'
                    : 'Storage Running Low'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Storage Used</span>
              <span className={`font-semibold ${colors.accent}`}>
                {Math.round(percentageUsed)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${colors.button}`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Help Text */}
          <div className={`mb-6 p-4 rounded-lg ${colors.bg}`}>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <Settings className="w-4 h-4 inline mr-2" />
              You can manage your files and free up space in your Data Management settings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="
                flex-1
                px-4
                py-2.5
                rounded-lg
                text-sm
                font-medium
                text-gray-700
                dark:text-gray-300
                bg-gray-100
                dark:bg-gray-700
                hover:bg-gray-200
                dark:hover:bg-gray-600
                transition-colors
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {isDismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
            <button
              onClick={handleManageStorage}
              className={`
                flex-1
                px-4
                py-2.5
                rounded-lg
                text-sm
                font-medium
                text-white
                ${colors.button}
                transition-colors
                shadow-md
                hover:shadow-lg
              `}
            >
              Manage Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
