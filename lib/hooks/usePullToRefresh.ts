import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
  maxPullDown?: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 80,
  maxPullDown = 120,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;
    const scrollableElement = document.scrollingElement || document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of page
      if (scrollableElement.scrollTop === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      // Only allow pulling down
      if (distance > 0 && scrollableElement.scrollTop === 0) {
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
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);

        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }

        try {
          await onRefresh();
        } catch (error) {
          logger.error('Refresh failed:', error, { component: 'lib-usePullToRefresh', action: 'service_call' });
        } finally {
          // Delay to show completion state
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        // Reset pull distance with animation
        setPullDistance(0);
      }
    };

    // Add event listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isPulling, isRefreshing, pullDistance, threshold, maxPullDown, onRefresh]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    shouldShowRefreshIndicator: pullDistance > 0 || isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}
