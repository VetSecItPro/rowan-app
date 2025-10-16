'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullScreenOnMobile?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  fullScreenOnMobile = true,
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
  };

  return (
    <div
      className={`
        fixed inset-0 z-50
        ${fullScreenOnMobile ? '' : 'flex items-center justify-center p-4'}
        ${fullScreenOnMobile ? 'sm:flex sm:items-center sm:justify-center sm:p-4' : ''}
      `}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Container with Glassmorphism */}
      <div
        className={`
          relative
          bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl
          border border-gray-200/50 dark:border-gray-700/50
          ${fullScreenOnMobile ? 'w-full h-full' : 'w-full max-w-md'}
          ${fullScreenOnMobile ? 'sm:w-auto sm:h-auto sm:rounded-xl' : 'rounded-xl'}
          ${fullScreenOnMobile ? `sm:${maxWidthClasses[maxWidth]}` : maxWidthClasses[maxWidth]}
          ${fullScreenOnMobile ? 'sm:max-h-[90vh]' : 'max-h-[90vh]'}
          overflow-y-auto
          overscroll-contain
          shadow-2xl
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white pr-12">
            {title}
          </h2>

          {/* Close Button - Mobile Optimized */}
          <button
            onClick={onClose}
            className="
              absolute top-3 right-3 sm:top-4 sm:right-4
              w-12 h-12 sm:w-10 sm:h-10
              flex items-center justify-center
              rounded-full
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-all
              focus:outline-none
              focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600
              sm:focus:ring-2
              active:scale-95
            "
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
