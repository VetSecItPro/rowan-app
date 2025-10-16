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

  const EDIT_THRESHOLD = 60; // Swipe 60px right to reveal edit
  const DELETE_THRESHOLD = -80; // Swipe 80px left to reveal delete

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

    // Snap to action or reset
    if (offsetX > EDIT_THRESHOLD / 2) {
      setOffsetX(EDIT_THRESHOLD);
    } else if (offsetX < DELETE_THRESHOLD / 2) {
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
        <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center">
          <button
            onClick={handleEdit}
            className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg active:bg-blue-600"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Delete Button (Right Side - Revealed on Left Swipe) */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center">
          <button
            onClick={handleDelete}
            className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg active:bg-red-600"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Swipeable Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
