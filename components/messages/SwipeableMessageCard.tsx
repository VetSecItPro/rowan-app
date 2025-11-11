'use client';

import { useState, useRef } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface SwipeableMessageCardProps {
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

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

  const EDIT_THRESHOLD = 50; // Swipe 50px right to reveal edit
  const DELETE_THRESHOLD = -70; // Swipe 70px left to reveal delete
  const SNAP_THRESHOLD = 20; // Minimum swipe to maintain reveal

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow swipe on own messages
    if (!isOwn) return;

    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isOwn) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Allow swipe in both directions for own messages
    if (diff > 0 && onEdit) {
      // Right swipe for edit
      setOffsetX(Math.min(diff, EDIT_THRESHOLD));
    } else if (diff < 0 && onDelete) {
      // Left swipe for delete
      setOffsetX(Math.max(diff, DELETE_THRESHOLD));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to action or reset with improved thresholds
    if (offsetX > SNAP_THRESHOLD) {
      setOffsetX(EDIT_THRESHOLD);
    } else if (offsetX < -SNAP_THRESHOLD) {
      setOffsetX(DELETE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
    setOffsetX(0);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
    setOffsetX(0);
  };

  // Don't make swipeable if not own message
  if (!isOwn) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Edit Button (Left Side - Revealed on Right Swipe) */}
      {onEdit && (
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
          className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 transition-all duration-300"
          style={{
            opacity: Math.max(0, Math.min(1, offsetX / EDIT_THRESHOLD)),
            transform: `translateX(${offsetX > 0 ? 0 : '-100%'})`,
          }}
        />
        {/* Delete Background (Left Swipe) */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 transition-all duration-300"
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
