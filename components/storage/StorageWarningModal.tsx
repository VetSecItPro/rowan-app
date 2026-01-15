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
        bg: 'bg-red-900/20',
        border: 'border-red-800',
        icon: 'text-red-400',
        accent: 'text-red-300',
        button: 'bg-red-600 bg-red-500 hover:bg-red-600',
      };
    } else if (percentageUsed >= 90) {
      return {
        bg: 'bg-orange-900/20',
        border: 'border-orange-800',
        icon: 'text-orange-400',
        accent: 'text-orange-300',
        button: 'bg-orange-600 bg-orange-500 hover:bg-orange-600',
      };
    } else {
      return {
        bg: 'bg-amber-900/20',
        border: 'border-amber-800',
        icon: 'text-amber-400',
        accent: 'text-amber-300',
        button: 'bg-amber-600 bg-amber-500 hover:bg-amber-600',
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      {/* Modal Container */}
      <div
        className={`
          absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto
          bg-gray-800
          sm:rounded-2xl
          shadow-2xl
          sm:max-w-md
          w-full sm:w-auto
          border-2
          ${colors.border}
          overflow-hidden
          transition-all
          duration-300
          animate-in
          fade-in-0
          zoom-in-95
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div className={`flex-shrink-0 h-2 ${colors.button}`} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
              <h3 className="text-lg font-semibold text-white mb-1">
                {percentageUsed >= 100
                  ? 'Storage Full'
                  : percentageUsed >= 90
                    ? 'Storage Almost Full'
                    : 'Storage Running Low'}
              </h3>
              <p className="text-sm text-gray-400">{message}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Storage Used</span>
              <span className={`font-semibold ${colors.accent}`}>
                {Math.round(percentageUsed)}%
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${colors.button}`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Help Text */}
          <div className={`mb-6 p-4 rounded-lg ${colors.bg}`}>
            <p className="text-sm text-gray-300">
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
                text-gray-300
                bg-gray-700
                hover:bg-gray-600
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
