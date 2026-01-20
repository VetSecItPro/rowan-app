'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

interface BottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Optional title for the header */
  title?: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Height of the sheet: 'auto', 'half', 'full', or specific percentage */
  height?: 'auto' | 'half' | 'full' | number;
  /** Whether to show the drag handle */
  showHandle?: boolean;
  /** Whether tapping the backdrop closes the sheet */
  closeOnBackdropClick?: boolean;
  /** Whether to show a close button in the header */
  showCloseButton?: boolean;
  /** Additional class names for the sheet container */
  className?: string;
}

// Height of the drag handle area for gesture detection
const HANDLE_HEIGHT = 36;
// Minimum velocity to trigger dismiss
const DISMISS_VELOCITY = 0.5;
// Minimum distance to trigger dismiss
const DISMISS_THRESHOLD = 0.3;

/**
 * A native-feeling bottom sheet component for mobile interfaces.
 * Supports swipe-to-dismiss gestures and smooth animations.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  closeOnBackdropClick = true,
  showCloseButton = true,
  className = '',
}: BottomSheetProps) {
  const isClient = typeof window !== 'undefined';
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const lastY = useRef(0);
  const velocity = useRef(0);

  // Lock scroll on the correct scroll container (main element)
  useScrollLock(isOpen);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Touch/drag handlers
  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    lastY.current = clientY;
    velocity.current = 0;
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    const delta = clientY - dragStartY.current;
    const timeDelta = Date.now() - dragStartTime.current;

    // Calculate velocity
    velocity.current = (clientY - lastY.current) / Math.max(timeDelta, 1);
    lastY.current = clientY;

    // Only allow downward drag
    if (delta > 0) {
      setDragOffset(delta);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !sheetRef.current) return;

    const sheetHeight = sheetRef.current.offsetHeight;
    const dragRatio = dragOffset / sheetHeight;

    // Dismiss if dragged past threshold or with sufficient velocity
    if (dragRatio > DISMISS_THRESHOLD || velocity.current > DISMISS_VELOCITY) {
      onClose();
    }

    // Reset
    setDragOffset(0);
    setIsDragging(false);
    velocity.current = 0;
  }, [isDragging, dragOffset, onClose]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY);
    e.preventDefault();
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse move/up handlers when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Calculate height styles
  const getHeightStyles = () => {
    switch (height) {
      case 'auto':
        return { maxHeight: '90vh' };
      case 'half':
        return { height: '50vh', maxHeight: '90vh' };
      case 'full':
        return { height: '95vh', maxHeight: '95vh' };
      default:
        if (typeof height === 'number') {
          return { height: `${height}vh`, maxHeight: '90vh' };
        }
        return { maxHeight: '90vh' };
    }
  };

  if (!isClient) return null;

  const sheetContent = (
    <div
      className={`
        fixed inset-0 z-50
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-label={closeOnBackdropClick ? 'Close' : undefined}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`
          absolute bottom-0 left-0 right-0
          bg-gray-900
          rounded-t-2xl
          shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${isDragging ? 'transition-none' : ''}
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
        style={{
          ...getHeightStyles(),
          transform: isOpen
            ? `translateY(${dragOffset}px)`
            : 'translateY(100%)',
          // Add safe area padding at bottom
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag Handle Area */}
        {showHandle && (
          <div
            className="
              flex items-center justify-center
              h-9 cursor-grab active:cursor-grabbing
              touch-none select-none
            "
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <div
              className={`
                w-10 h-1 rounded-full
                bg-gray-600
                transition-all duration-200
                ${isDragging ? 'w-12 bg-gray-500' : ''}
              `}
            />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`
              flex items-center justify-between
              px-4 pb-3
              ${!showHandle ? 'pt-4' : ''}
              border-b border-gray-800
            `}
          >
            {title && (
              <h2
                id="bottom-sheet-title"
                className="text-lg font-semibold text-white"
              >
                {title}
              </h2>
            )}
            {!title && <div />}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  w-10 h-10 -mr-2
                  flex items-center justify-center
                  rounded-full
                  text-gray-400
                  hover:bg-gray-800
                  transition-colors
                  active:scale-95
                  touch-manipulation
                "
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className="
            flex-1 overflow-y-auto overscroll-contain
            px-4 py-4
            -webkit-overflow-scrolling-touch
          "
          style={{
            // Momentum scrolling on iOS
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}

/**
 * Hook to manage bottom sheet state
 */
export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}
