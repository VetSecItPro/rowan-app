'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  /** @deprecated Use `disabled` instead. `enabled={false}` is equivalent to `disabled={true}`. */
  enabled?: boolean;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 130;
const RESISTANCE = 0.45;

/**
 * Mobile-only pull-to-refresh wrapper.
 *
 * Wraps children in a container that listens for downward touch gestures
 * when scrolled to the top. Once the user pulls past the threshold and
 * releases, the `onRefresh` callback fires. A spinning RefreshCw icon
 * provides visual feedback throughout the gesture.
 *
 * On non-touch (desktop) devices the component renders children directly
 * with no overhead.
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  enabled,
}: PullToRefreshProps) {
  // Support both `disabled` and legacy `enabled` prop
  const isDisabled = disabled || (enabled !== undefined && !enabled);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const rafRef = useRef<number>(0);

  // Detect touch capability once on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    // Haptic feedback when available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    try {
      await onRefresh();
    } catch {
      // Silently handle -- callers manage their own error state
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, onRefresh]);

  useEffect(() => {
    if (!isTouchDevice || isDisabled) return;

    const container = containerRef.current;
    if (!container) return;

    /**
     * Determine whether the touch originated inside a nested scrollable
     * element that has its own scroll offset. If so, the pull gesture
     * should not activate because the user is scrolling that inner
     * container, not the page.
     */
    function isInsideNestedScroll(target: EventTarget | null): boolean {
      let el = target as HTMLElement | null;
      const containerEl = containerRef.current;
      while (el && el !== containerEl) {
        if (el.scrollTop > 0) return true;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight &&
          el.scrollTop > 0
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    function getScrollTop(): number {
      // Check if the container itself scrolls, otherwise use the
      // closest scrollable ancestor (typically <main>).
      const scrollParent = container!.closest('main') || container!;
      return scrollParent.scrollTop;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (isInsideNestedScroll(e.target)) return;

      if (getScrollTop() <= 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const rawDistance = currentY - startYRef.current;

      if (rawDistance > 0 && getScrollTop() <= 0) {
        e.preventDefault();

        const resisted = Math.min(rawDistance * RESISTANCE, MAX_PULL);

        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setPullDistance(resisted);
        });
      } else if (rawDistance < 0) {
        // User reversed direction -- cancel pull
        isPullingRef.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouchDevice, isDisabled, isRefreshing, pullDistance, handleRefresh]);

  // Normalised 0-1 progress toward threshold
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const pastThreshold = progress >= 1;
  const showIndicator = pullDistance > 4 || isRefreshing;

  // On desktop, just render children
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            key="pull-indicator"
            initial={{ opacity: 0, y: -40, scale: 0.4 }}
            animate={{
              opacity: 1,
              y: isRefreshing ? 12 : Math.min(pullDistance - 36, 24),
              scale: isRefreshing ? 1 : 0.5 + progress * 0.5,
            }}
            exit={{ opacity: 0, y: -40, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute left-1/2 z-50 pointer-events-none"
            style={{ translateX: '-50%' }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 shadow-lg flex items-center justify-center">
                <motion.div
                  animate={{
                    rotate: isRefreshing ? 360 : progress * 360,
                  }}
                  transition={
                    isRefreshing
                      ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                      : { type: 'spring', stiffness: 200, damping: 20 }
                  }
                >
                  <RefreshCw className="w-5 h-5 text-orange-500" />
                </motion.div>
              </div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                {isRefreshing ? (
                  <motion.span
                    key="refreshing"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs font-medium text-orange-500"
                  >
                    Refreshing...
                  </motion.span>
                ) : pullDistance > 10 ? (
                  <motion.span
                    key={pastThreshold ? 'release' : 'pull'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs font-medium text-gray-400"
                  >
                    {pastThreshold ? 'Release to refresh' : 'Pull to refresh'}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content -- shifts down proportionally */}
      <motion.div
        animate={{ y: isRefreshing ? PULL_THRESHOLD : pullDistance }}
        transition={
          pullDistance === 0 || isRefreshing
            ? { type: 'spring', stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}
