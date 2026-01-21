'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Conversation } from '@/lib/services/messages-service';

interface SwipeableConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

export function SwipeableConversationItem({
  conversation,
  isSelected,
  onClick,
  onDelete,
  children,
}: SwipeableConversationItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = -80; // Swipe 80px left to reveal delete

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Only allow left swipe
    if (diff < 0) {
      setOffsetX(Math.max(diff, DELETE_THRESHOLD));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // If swiped past threshold, keep delete button visible
    if (offsetX < DELETE_THRESHOLD / 2) {
      setOffsetX(DELETE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
    setOffsetX(0);
  };

  const handleClick = () => {
    if (offsetX < 0) {
      // If delete is showing, close it
      setOffsetX(0);
    } else {
      onClick();
    }
  };

  // Reset swipe when conversation changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffsetX(0);
  }, [conversation.id]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete Button Background */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center text-white active:bg-red-600"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable Content */}
      <div
        ref={itemRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        className="relative bg-gray-800 cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
}
