'use client';

import { useRef, useState, ReactNode, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';
import { hapticLight } from '@/lib/utils/haptics';

interface SwipeableProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon?: ReactNode;
    color?: string;
    label?: string;
  };
  rightAction?: {
    icon?: ReactNode;
    color?: string;
    label?: string;
  };
  threshold?: number;
  disabled?: boolean;
}

/** Wraps children with horizontal swipe gesture detection and action reveals. */
export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = {
    icon: <Trash2 className="w-5 h-5" />,
    color: 'bg-red-500',
    label: 'Delete',
  },
  rightAction = {
    icon: <Check className="w-5 h-5" />,
    color: 'bg-green-500',
    label: 'Complete',
  },
  threshold = 100,
  disabled = false,
}: SwipeableProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontalSwipe = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isHorizontalSwipe.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping && !isHorizontalSwipe.current) {
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

        // Determine if this is a horizontal swipe
        if (deltaX > deltaY && deltaX > 10) {
          isHorizontalSwipe.current = true;
          setIsSwiping(true);
        } else if (deltaY > deltaX && deltaY > 10) {
          // Vertical scroll detected, don't interfere
          return;
        }
      }

      if (isHorizontalSwipe.current) {
        e.preventDefault(); // Prevent scroll during swipe

        const distance = e.touches[0].clientX - touchStartX.current;

        // Limit swipe distance
        const maxDistance = threshold * 1.5;
        const constrainedDistance = Math.max(
          -maxDistance,
          Math.min(maxDistance, distance)
        );

        setSwipeDistance(constrainedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isSwiping) return;

      // Check if swipe threshold was reached
      if (swipeDistance <= -threshold && onSwipeLeft) {
        hapticLight();
        await onSwipeLeft();
      } else if (swipeDistance >= threshold && onSwipeRight) {
        hapticLight();
        await onSwipeRight();
      }

      // Reset
      setSwipeDistance(0);
      setIsSwiping(false);
      isHorizontalSwipe.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, isSwiping, swipeDistance, threshold, onSwipeLeft, onSwipeRight]);

  const getActionOpacity = () => {
    return Math.min(Math.abs(swipeDistance) / threshold, 1);
  };

  const shouldShowLeftAction = swipeDistance < -20 && onSwipeLeft;
  const shouldShowRightAction = swipeDistance > 20 && onSwipeRight;

  return (
    <div ref={containerRef} className="relative overflow-hidden touch-pan-y">
      {/* Left action (swipe right to reveal) */}
      {shouldShowRightAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 ${rightAction.color} text-white transition-opacity`}
          style={{ opacity: getActionOpacity(), width: `${Math.abs(swipeDistance)}px` }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            {Math.abs(swipeDistance) > 60 && (
              <span className="text-sm font-medium">{rightAction.label}</span>
            )}
          </div>
        </div>
      )}

      {/* Right action (swipe left to reveal) */}
      {shouldShowLeftAction && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 ${leftAction.color} text-white transition-opacity`}
          style={{ opacity: getActionOpacity(), width: `${Math.abs(swipeDistance)}px` }}
        >
          <div className="flex items-center gap-2">
            {Math.abs(swipeDistance) > 60 && (
              <span className="text-sm font-medium">{leftAction.label}</span>
            )}
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateX(${swipeDistance}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
