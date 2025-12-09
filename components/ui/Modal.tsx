'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullScreenOnMobile?: boolean;
  /** Whether to trap focus within the modal (default: true) */
  trapFocus?: boolean;
  /** Whether to auto-focus the first focusable element (default: true) */
  autoFocus?: boolean;
}

// Focus trap constants
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  fullScreenOnMobile = true,
  trapFocus = true,
  autoFocus = true,
}: ModalProps) {
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

  // Get all focusable elements within the modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    const elements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Focus trap handler
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || event.key !== 'Tab') return;

    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // Handle Shift+Tab (backwards)
    if (event.shiftKey) {
      if (activeElement === firstElement || !modalRef.current?.contains(activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Handle Tab (forwards)
      if (activeElement === lastElement || !modalRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [trapFocus, getFocusableElements]);

  // Focus trap and auto-focus effect
  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    // Store the currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Auto-focus first focusable element
    if (autoFocus) {
      requestAnimationFrame(() => {
        const elements = getFocusableElements();
        if (elements.length > 0) {
          elements[0].focus();
        }
      });
    }

    // Add tab key handler
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);

      // Return focus to previously focused element
      if (previouslyFocusedRef.current) {
        requestAnimationFrame(() => {
          previouslyFocusedRef.current?.focus();
        });
      }
    };
  }, [isOpen, trapFocus, autoFocus, getFocusableElements, handleTabKey]);

  // Swipe to dismiss functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const dismissThreshold = 150; // pixels
  const transform = touchStart !== null && touchCurrent !== null
    ? Math.max(0, touchCurrent - touchStart)
    : 0;
  const dragProgress = Math.min(transform / dismissThreshold, 1);
  const shouldDismiss = transform > dismissThreshold;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!fullScreenOnMobile) return; // Only on mobile full-screen modals

    const touch = e.touches[0];
    setTouchStart(touch.clientY);
    setTouchCurrent(touch.clientY);
    setIsDragging(true);
    setHasTriggeredHaptic(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStart === null) return;

    const touch = e.touches[0];
    const newY = touch.clientY;

    // Only allow downward swipes from near the top
    if (newY >= touchStart) {
      setTouchCurrent(newY);

      // Trigger haptic feedback when crossing threshold
      if (newY - touchStart > dismissThreshold && !hasTriggeredHaptic) {
        // iOS-style haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
        setHasTriggeredHaptic(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    if (shouldDismiss) {
      onClose();
    }

    // Reset all touch state
    setTouchStart(null);
    setTouchCurrent(null);
    setIsDragging(false);
    setHasTriggeredHaptic(false);
  };

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Container with Glassmorphism */}
      <div
        ref={modalRef}
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
          ${isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'}
        `}
        style={{
          transform: fullScreenOnMobile ? `translateY(${transform}px)` : undefined,
          opacity: fullScreenOnMobile ? Math.max(0.5, 1 - dragProgress * 0.5) : 1,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Swipe Indicator - Mobile Only */}
          {fullScreenOnMobile && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-200 sm:hidden"
              style={{
                opacity: isDragging ? 1 : 0.6,
                width: isDragging ? '48px' : '40px',
                backgroundColor: shouldDismiss
                  ? 'rgb(34, 197, 94)' // green-500
                  : isDragging
                    ? 'rgb(156, 163, 175)' // gray-400
                    : undefined
              }}
            />
          )}

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
        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 pb-safe-4 sm:pb-6 relative" style={{ overflowX: 'visible', overflowY: 'visible' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
