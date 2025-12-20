'use client';

import { useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  enabled?: boolean;
  threshold?: number;
  maxPullDown?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  threshold = 80,
  maxPullDown = 120,
  className = '',
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      // Delay to show completion state
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    }
  }, [isRefreshing, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollContainer = container.closest('main') || container;
      startScrollTop.current = scrollContainer.scrollTop;

      // Only start pull if at top of scroll container
      if (startScrollTop.current <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const scrollContainer = container.closest('main') || container;
      const currentScrollTop = scrollContainer.scrollTop;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Only allow pulling down when at top
      if (distance > 0 && currentScrollTop <= 0) {
        // Prevent default scroll behavior
        e.preventDefault();

        // Apply resistance effect
        const resistedDistance = Math.min(
          distance * 0.5, // 50% resistance
          maxPullDown
        );

        rafId = requestAnimationFrame(() => {
          setPullDistance(resistedDistance);
        });
      } else if (distance < 0) {
        // User is scrolling up, cancel pull
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh();
      } else {
        // Reset pull distance with animation
        setPullDistance(0);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isPulling, isRefreshing, pullDistance, threshold, maxPullDown, handleRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull-to-refresh indicator */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 sm:hidden pointer-events-none"
        style={{
          top: `${Math.max(16, pullDistance - 40)}px`,
          opacity: shouldShowIndicator ? 1 : 0,
          transform: `translateX(-50%) scale(${Math.min(pullProgress + 0.5, 1)})`,
        }}
      >
        <div
          className={`
            w-10 h-10 rounded-full bg-white dark:bg-gray-800
            shadow-lg border border-gray-200 dark:border-gray-700
            flex items-center justify-center
            ${isRefreshing ? 'animate-pulse' : ''}
          `}
        >
          <RefreshCw
            className={`
              w-5 h-5 text-orange-500
              ${isRefreshing ? 'animate-spin' : ''}
              transition-transform duration-200
            `}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${pullProgress * 360}deg)`,
            }}
          />
        </div>
        {/* Pull indicator text */}
        {!isRefreshing && pullDistance > 10 && (
          <div className="text-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
        {isRefreshing && (
          <div className="text-center mt-1">
            <span className="text-xs text-orange-500 font-medium">
              Refreshing...
            </span>
          </div>
        )}
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
