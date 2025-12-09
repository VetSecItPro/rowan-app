'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualizedListProps<T> {
  /** The items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Height of the container */
  containerHeight?: number | string;
  /** Number of extra items to render above/below the viewport */
  overscan?: number;
  /** Key extractor function */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Callback when an item becomes visible */
  onItemVisible?: (item: T, index: number) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Gap between items in pixels */
  gap?: number;
}

/**
 * A virtualized list component for efficiently rendering large lists.
 * Only renders items that are visible in the viewport plus a small buffer.
 *
 * Benefits:
 * - Dramatically reduces DOM nodes for large lists
 * - Smooth scrolling performance on mobile
 * - Memory efficient
 *
 * Use when:
 * - List has more than 50-100 items
 * - Items are moderately complex (not just text)
 * - Scroll performance is important
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = '100%',
  overscan = 3,
  keyExtractor,
  onItemVisible,
  className = '',
  emptyState,
  loading = false,
  loadingComponent,
  gap = 0,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightPx, setContainerHeightPx] = useState(0);

  // Measure container height on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeightPx(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Calculate effective item height including gap
  const effectiveItemHeight = itemHeight + gap;

  // Calculate total height of all items
  const totalHeight = items.length * effectiveItemHeight - (items.length > 0 ? gap : 0);

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (containerHeightPx === 0 || items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }

    const startIdx = Math.max(
      0,
      Math.floor(scrollTop / effectiveItemHeight) - overscan
    );
    const endIdx = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeightPx) / effectiveItemHeight) + overscan
    );

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      visibleItems: items.slice(startIdx, endIdx),
    };
  }, [items, scrollTop, containerHeightPx, effectiveItemHeight, overscan]);

  // Notify when items become visible
  useEffect(() => {
    if (!onItemVisible) return;

    visibleItems.forEach((item, i) => {
      const actualIndex = startIndex + i;
      onItemVisible(item, actualIndex);
    });
  }, [visibleItems, startIndex, onItemVisible]);

  // Default key extractor
  const getKey = useCallback(
    (item: T, index: number): string | number => {
      if (keyExtractor) {
        return keyExtractor(item, index);
      }
      // Try to use common id fields
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if ('id' in obj) return String(obj.id);
        if ('key' in obj) return String(obj.key);
        if ('_id' in obj) return String(obj._id);
      }
      return index;
    },
    [keyExtractor]
  );

  // Loading state
  if (loading && loadingComponent) {
    return (
      <div
        className={`overflow-y-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {loadingComponent}
      </div>
    );
  }

  // Empty state
  if (!loading && items.length === 0 && emptyState) {
    return (
      <div
        className={`overflow-y-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyState}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overscroll-contain ${className}`}
      style={{
        height: containerHeight,
        WebkitOverflowScrolling: 'touch',
      }}
      onScroll={handleScroll}
    >
      {/* Spacer div to maintain scroll height */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Rendered items with absolute positioning */}
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={getKey(item, actualIndex)}
              style={{
                position: 'absolute',
                top: actualIndex * effectiveItemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Simpler virtualized list for variable height items using IntersectionObserver.
 * Less efficient than fixed-height virtualization but works with any item size.
 */
export function LazyList<T>({
  items,
  renderItem,
  keyExtractor,
  containerHeight = '100%',
  className = '',
  emptyState,
  placeholder,
  threshold = 0.1,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  containerHeight?: number | string;
  className?: string;
  emptyState?: React.ReactNode;
  placeholder?: React.ReactNode;
  threshold?: number;
}) {
  // Track which items have been rendered
  const [renderedIndices, setRenderedIndices] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Set up IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
          if (entry.isIntersecting) {
            setRenderedIndices((prev) => new Set(prev).add(index));
          }
        });
      },
      { threshold }
    );

    return () => observerRef.current?.disconnect();
  }, [threshold]);

  // Observe items
  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;

    itemRefs.current.forEach((el, index) => {
      if (!renderedIndices.has(index)) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [items.length, renderedIndices]);

  const getKey = useCallback(
    (item: T, index: number): string | number => {
      if (keyExtractor) {
        return keyExtractor(item, index);
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if ('id' in obj) return String(obj.id);
        if ('key' in obj) return String(obj.key);
      }
      return index;
    },
    [keyExtractor]
  );

  // Empty state
  if (items.length === 0 && emptyState) {
    return (
      <div
        className={`overflow-y-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyState}
      </div>
    );
  }

  return (
    <div
      className={`overflow-y-auto overscroll-contain ${className}`}
      style={{
        height: containerHeight,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((item, index) => (
        <div
          key={getKey(item, index)}
          data-index={index}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(index, el);
            } else {
              itemRefs.current.delete(index);
            }
          }}
        >
          {renderedIndices.has(index) || index < 10
            ? renderItem(item, index)
            : placeholder || <div style={{ height: 60 }} />}
        </div>
      ))}
    </div>
  );
}
