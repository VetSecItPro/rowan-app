'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  /** Header gradient class for feature branding (e.g., "bg-gradient-meals", "bg-purple-600") */
  headerGradient?: string;
  /** Whether to trap focus within the modal (default: true) */
  trapFocus?: boolean;
  /** Whether to auto-focus the first focusable element (default: true) */
  autoFocus?: boolean;
  /** Optional footer content (buttons, etc.) - sticky at bottom on mobile */
  footer?: React.ReactNode;
  /** Hide the close button (useful when footer has cancel button) */
  hideCloseButton?: boolean;
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
  subtitle,
  children,
  maxWidth = 'md',
  headerGradient,
  trapFocus = true,
  autoFocus = true,
  footer,
  hideCloseButton = false,
}: ModalProps) {
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Lock scroll on the correct scroll container (main element)
  useScrollLock(isOpen);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
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

  // Swipe to dismiss functionality - only from header area
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const dismissThreshold = 120; // pixels - reduced for easier dismiss
  const transform = touchStart !== null && touchCurrent !== null
    ? Math.max(0, touchCurrent - touchStart)
    : 0;
  const dragProgress = Math.min(transform / dismissThreshold, 1);
  const shouldDismiss = transform > dismissThreshold;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow swipe from header area
    if (!headerRef.current?.contains(e.target as Node)) return;

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

    // Only allow downward swipes
    if (newY >= touchStart) {
      setTouchCurrent(newY);

      // Trigger haptic feedback when crossing threshold
      if (newY - touchStart > dismissThreshold && !hasTriggeredHaptic) {
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

  if (!isVisible) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/70 backdrop-blur-sm
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Container - Bottom sheet on mobile, centered on desktop */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          relative w-full
          bg-gray-800
          border-t border-x sm:border border-gray-700/50
          rounded-t-2xl sm:rounded-xl
          max-h-[92vh] sm:max-h-[90vh]
          overflow-hidden
          overscroll-contain
          shadow-2xl
          flex flex-col
          transition-all duration-300 ease-out
          ${maxWidthClasses[maxWidth]}
          ${isAnimating
            ? 'translate-y-0 sm:translate-y-0 sm:scale-100 opacity-100'
            : 'translate-y-full sm:translate-y-4 sm:scale-95 opacity-0'
          }
          ${isDragging ? '!transition-none' : ''}
        `}
        style={{
          transform: isDragging ? `translateY(${transform}px)` : undefined,
          opacity: isDragging ? Math.max(0.5, 1 - dragProgress * 0.5) : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className={`
            flex-shrink-0
            ${headerGradient || 'bg-gray-800/80 backdrop-blur-md'}
            border-b border-gray-700/50
            px-4 sm:px-6
            pt-3 pb-3 sm:py-4
            cursor-grab active:cursor-grabbing sm:cursor-default
          `}
        >
          {/* Swipe Indicator - Mobile Only */}
          <div
            className={`
              absolute top-2 left-1/2 -translate-x-1/2
              h-1 rounded-full
              transition-all duration-200
              sm:hidden
              ${shouldDismiss ? 'bg-green-500' : isDragging ? 'bg-gray-400' : 'bg-gray-600'}
            `}
            style={{
              width: isDragging ? '48px' : '36px',
              opacity: isDragging ? 1 : 0.6,
            }}
          />

          <div className="flex items-center justify-between mt-1 sm:mt-0">
            <div className="pr-10">
              <h2
                id="modal-title"
                className={`text-base sm:text-xl font-semibold sm:font-bold ${headerGradient ? 'text-white' : 'text-white'}`}
              >
                {title}
              </h2>
              {subtitle && (
                <p className={`text-sm mt-0.5 ${headerGradient ? 'text-white/80' : 'text-gray-400'}`}>
                  {subtitle}
                </p>
              )}
            </div>

            {/* Close Button */}
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className={`
                  absolute top-2.5 right-3 sm:top-3.5 sm:right-4
                  w-10 h-10 sm:w-9 sm:h-9
                  flex items-center justify-center
                  rounded-full
                  ${headerGradient ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-700 text-gray-400'}
                  transition-all
                  focus:outline-none
                  focus:ring-2 focus:ring-white/30
                  active:scale-95
                `}
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 overscroll-contain">
          {children}
        </div>

        {/* Footer - Sticky on mobile */}
        {footer && (
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-md pb-safe-4 sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
