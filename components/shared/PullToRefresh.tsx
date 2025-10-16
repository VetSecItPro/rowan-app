'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { hapticLight } from '@/lib/utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtTop = useRef(true);

  const PULL_THRESHOLD = 80; // Distance required to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Check if scrolled to top
      isAtTop.current = container.scrollTop === 0;
      if (isAtTop.current) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || isRefreshing || !isAtTop.current) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - pullStartY;

      // Only track downward pulls when at top
      if (distance > 0 && container.scrollTop === 0) {
        // Prevent default scroll behavior
        e.preventDefault();

        // Apply resistance curve (gets harder to pull as you go further)
        const resistedDistance = Math.min(
          distance * 0.5,
          MAX_PULL
        );

        setPullDistance(resistedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (disabled || isRefreshing) return;

      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        hapticLight(); // Haptic feedback on refresh trigger

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }

      setPullDistance(0);
      setPullStartY(0);
      isAtTop.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, pullDistance, pullStartY, onRefresh]);

  const getIconRotation = () => {
    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
    return progress * 360;
  };

  const getIconOpacity = () => {
    return Math.min(pullDistance / PULL_THRESHOLD, 1);
  };

  return (
    <div ref={containerRef} className="relative overflow-y-auto h-full">
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-opacity z-10"
        style={{
          height: `${pullDistance}px`,
          opacity: getIconOpacity(),
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform"
              style={{ transform: `rotate(${getIconRotation()}deg)` }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
