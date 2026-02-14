'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  label: string;
  onAction: () => void;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;

/** Renders a list item with swipeable left/right action reveals. */
export function SwipeableListItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { icon: <Check className="w-5 h-5" />, color: 'bg-emerald-500', label: 'Complete', onAction: () => onSwipeRight?.() },
  rightAction = { icon: <Trash2 className="w-5 h-5" />, color: 'bg-red-500', label: 'Delete', onAction: () => onSwipeLeft?.() },
  disabled = false,
}: SwipeableListItemProps) {
  const x = useMotionValue(0);
  const [_isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Background opacity based on drag distance
  const leftBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = () => {
    const currentX = x.get();
    setIsDragging(false);

    if (currentX > SWIPE_THRESHOLD && onSwipeRight) {
      leftAction.onAction();
    } else if (currentX < -SWIPE_THRESHOLD && onSwipeLeft) {
      rightAction.onAction();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' && onSwipeLeft) {
      e.preventDefault();
      rightAction.onAction();
    } else if (e.key === 'ArrowRight' && onSwipeRight) {
      e.preventDefault();
      leftAction.onAction();
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  const availableActions = [];
  if (onSwipeRight) availableActions.push(`ArrowRight to ${leftAction.label}`);
  if (onSwipeLeft) availableActions.push(`ArrowLeft to ${rightAction.label}`);
  const ariaLabel = availableActions.length > 0
    ? `Swipeable item. ${availableActions.join(', ')}`
    : 'Swipeable item';

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
      tabIndex={0}
      role="listitem"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {/* Left action background (swipe right to reveal) */}
      {onSwipeRight && (
        <motion.div
          style={{ opacity: leftBgOpacity }}
          className={`absolute inset-y-0 left-0 w-full ${leftAction.color} flex items-center pl-6`}
        >
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            {leftAction.icon}
            <span>{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Right action background (swipe left to reveal) */}
      {onSwipeLeft && (
        <motion.div
          style={{ opacity: rightBgOpacity }}
          className={`absolute inset-y-0 right-0 w-full ${rightAction.color} flex items-center justify-end pr-6`}
        >
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <span>{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}

      {/* Draggable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: onSwipeLeft ? -SWIPE_THRESHOLD * 1.5 : 0, right: onSwipeRight ? SWIPE_THRESHOLD * 1.5 : 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-gray-800 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
