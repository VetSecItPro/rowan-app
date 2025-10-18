'use client';

import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { SecondaryButton, CTAButton } from '@/components/ui/EnhancedButton';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  confirmLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  confirmLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: XCircle,
      iconColor: 'text-red-500',
      confirmBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      confirmBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      confirmBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      confirmBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700',
      borderColor: 'border-green-200 dark:border-green-800',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 w-full h-full sm:h-auto sm:w-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto overscroll-contain sm:rounded-xl shadow-2xl flex flex-col"
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-5 border-b ${style.borderColor}`}>
          <Icon className={`w-6 h-6 flex-shrink-0 ${style.iconColor}`} aria-hidden="true" />
          <h2
            id="dialog-title"
            className="text-lg sm:text-base font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 sm:py-5 overflow-y-auto">
          <p
            id="dialog-description"
            className="text-base sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <SecondaryButton
            onClick={onClose}
            disabled={confirmLoading}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-6 py-3 sm:py-2.5 text-base sm:text-sm"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </SecondaryButton>
          <CTAButton
            onClick={onConfirm}
            disabled={confirmLoading}
            breathing
            ripple
            icon={confirmLoading ? null : <Icon className="w-4 h-4" />}
            className={`w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-6 py-3 sm:py-2.5 text-base sm:text-sm ${style.confirmBg}`}
            aria-label={confirmLabel}
          >
            {confirmLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              confirmLabel
            )}
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
