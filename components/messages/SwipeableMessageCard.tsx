'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface SwipeableMessageCardProps {
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

/** Renders a swipeable message card with reply and delete swipe actions. */
export function SwipeableMessageCard({
  isOwn,
  onEdit,
  onDelete,
  children,
}: SwipeableMessageCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const autoRevertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const EDIT_THRESHOLD = 50; // Swipe 50px right to reveal edit
  const DELETE_THRESHOLD = -70; // Swipe 70px left to reveal delete
  const SNAP_THRESHOLD = 20; // Minimum swipe to maintain reveal
  const AUTO_REVERT_DELAY = 3000; // Auto-revert after 3 seconds of inactivity

  // Clear any existing timeout
  const clearAutoRevertTimeout = useCallback(() => {
    if (autoRevertTimeoutRef.current) {
      clearTimeout(autoRevertTimeoutRef.current);
      autoRevertTimeoutRef.current = null;
    }
  }, []);

  // Start auto-revert timer when swipe action is revealed
  const startAutoRevertTimer = useCallback(() => {
    clearAutoRevertTimeout();
    autoRevertTimeoutRef.current = setTimeout(() => {
      setOffsetX(0);
    }, AUTO_REVERT_DELAY);
  }, [clearAutoRevertTimeout]);

  // Handle click outside to dismiss swipe action
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (offsetX !== 0 && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOffsetX(0);
        clearAutoRevertTimeout();
      }
    };

    if (offsetX !== 0) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [offsetX, clearAutoRevertTimeout]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      clearAutoRevertTimeout();
    };
  }, [clearAutoRevertTimeout]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Allow swipe for delete on all messages (delete for me)
    // Only allow edit swipe on own messages
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Right swipe for edit - only for own messages
    if (diff > 0 && onEdit && isOwn) {
      setOffsetX(Math.min(diff, EDIT_THRESHOLD));
    } else if (diff < 0 && onDelete) {
      // Left swipe for delete - works for all messages (delete for me or delete for everyone)
      setOffsetX(Math.max(diff, DELETE_THRESHOLD));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to action or reset with improved thresholds
    if (offsetX > SNAP_THRESHOLD) {
      setOffsetX(EDIT_THRESHOLD);
      startAutoRevertTimer(); // Start timer when edit is revealed
    } else if (offsetX < -SNAP_THRESHOLD) {
      setOffsetX(DELETE_THRESHOLD);
      startAutoRevertTimer(); // Start timer when delete is revealed
    } else {
      setOffsetX(0);
      clearAutoRevertTimeout();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAutoRevertTimeout();
    onEdit?.();
    setOffsetX(0);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAutoRevertTimeout();
    onDelete?.();
    setOffsetX(0);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Edit Button (Left Side - Revealed on Right Swipe) - Only for own messages */}
      {onEdit && isOwn && (
        <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-start pl-2 z-20">
          <div className={`transition-all duration-300 ${offsetX > EDIT_THRESHOLD / 3 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <button
              onClick={handleEdit}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all duration-150 border-2 border-white/20"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Button (Right Side - Revealed on Left Swipe) */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-end pr-2 z-20">
          <div className={`transition-all duration-300 ${offsetX < DELETE_THRESHOLD / 3 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <button
              onClick={handleDelete}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all duration-150 border-2 border-white/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Background Feedback */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {/* Edit Background (Right Swipe) */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-950/30 to-blue-900/30 transition-all duration-300"
          style={{
            opacity: Math.max(0, Math.min(1, offsetX / EDIT_THRESHOLD)),
            transform: `translateX(${offsetX > 0 ? 0 : '-100%'})`,
          }}
        />
        {/* Delete Background (Left Swipe) */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-red-950/30 to-red-900/30 transition-all duration-300"
          style={{
            opacity: Math.max(0, Math.min(1, Math.abs(offsetX / DELETE_THRESHOLD))),
            transform: `translateX(${offsetX < 0 ? 0 : '100%'})`,
          }}
        />
      </div>

      {/* Swipeable Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
}
