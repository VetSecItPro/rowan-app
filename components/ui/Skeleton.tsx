'use client';

import { CSSProperties, useMemo } from 'react';

// ─── Shimmer Skeleton ────────────────────────────────────────────────
// Replaces basic animate-pulse with a gradient sweep effect.
// Base: gray-800, highlight sweep: gray-700, 1.5s infinite ease-in-out

const shimmerStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(90deg, rgb(31 41 55) 0%, rgb(55 65 81) 40%, rgb(55 65 81) 60%, rgb(31 41 55) 100%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
};

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClass = useMemo(() => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      case 'rectangular':
      default:
        return 'rounded';
    }
  }, [variant]);

  const inlineStyle: CSSProperties = {
    ...shimmerStyle,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <div
      className={`${variantClass} ${className}`}
      style={inlineStyle}
      aria-hidden="true"
    />
  );
}

// ─── Skeleton Text ───────────────────────────────────────────────────
// Multiple lines of varying widths for text placeholder

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  // Consistent widths that look natural
  const lineWidths = ['100%', '92%', '76%', '88%', '64%', '80%', '72%', '96%'];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-4"
          width={lineWidths[i % lineWidths.length]}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────
// Card-shaped placeholder with image area and text lines

interface SkeletonCardProps {
  className?: string;
  /** Show image area at the top */
  withImage?: boolean;
  /** Number of text lines below image */
  lines?: number;
}

export function SkeletonCard({
  className = '',
  withImage = true,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${className}`}
    >
      {withImage && <Skeleton className="w-full h-40" />}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            width={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Avatar ─────────────────────────────────────────────────
// Circular with configurable size

interface SkeletonAvatarProps {
  /** Size in pixels (default 40) */
  size?: number;
  className?: string;
}

export function SkeletonAvatar({ size = 40, className = '' }: SkeletonAvatarProps) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
    />
  );
}

// ─── Feature-specific skeletons (preserved from original) ────────────

export function MealCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-24 h-24 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarDaySkeleton() {
  return (
    <div className="min-h-[300px] rounded-lg border-2 border-gray-700 bg-gray-800 p-3">
      <div className="mb-3 pb-2 border-b border-gray-700">
        <Skeleton className="h-4 w-12 mb-1" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

// Mobile-optimized day card skeleton that matches the vertical card layout
export function MobileDayCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-gray-700 bg-gray-800 p-4">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
      {/* Meal items */}
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

// Mobile calendar loading skeleton with day strip + stacked cards
export function MobileCalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Day strip skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-lg" />
        ))}
      </div>
      {/* Stacked day cards skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <MobileDayCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="bg-black/50 border border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <Skeleton className="h-4 w-full ml-10" />
          <Skeleton className="h-4 w-3/4 ml-10" />
        </div>
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function MilestoneCardSkeleton() {
  return (
    <div className="bg-black/50 border border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-4 w-full ml-10" />
        </div>
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="relative h-3 rounded-full">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-lg p-4 sm:p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <Skeleton className="w-6 h-6 rounded flex-shrink-0 mt-0.5" />

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Skeleton className="h-5 w-3/4 max-w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-80" />
            <Skeleton className="h-4 w-2/3 max-w-60 mt-1" />
          </div>
        </div>

        {/* More Menu */}
        <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <Skeleton className="w-3 h-3" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-1">
          <Skeleton className="w-3 h-3" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Status Badge */}
        <Skeleton className="h-5 w-16 rounded-full ml-auto" />
      </div>

      {/* Optional Assigned User */}
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="w-3 h-3" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
