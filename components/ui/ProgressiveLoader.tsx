/**
 * Progressive Loading Enhancement Components
 *
 * Advanced loading states with staggered animations and enhanced UX patterns
 */

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Enhanced progressive loading with staggered content reveal
 */
export function ProgressiveContentLoader({
  children,
  stages = ['Initializing...', 'Loading components...', 'Almost ready...'],
  stageDelay = 800,
  className = '',
}: {
  children: React.ReactNode;
  stages?: string[];
  stageDelay?: number;
  className?: string;
}) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stageDelay);

    return () => clearInterval(timer);
  }, [stages.length, stageDelay]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progressive stage indicator */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400 transition-all duration-300">
          {stages[currentStage]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ease-out"
          style={{
            width: `${((currentStage + 1) / stages.length) * 100}%`,
          }}
        />
      </div>

      {/* Staggered content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: Math.min(currentStage + 2, 4) }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse transition-opacity duration-500 ${
              i <= currentStage ? 'opacity-100' : 'opacity-40'
            }`}
            style={{
              width: `${Math.random() * 40 + 60}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {children}
    </div>
  );
}

/**
 * Enhanced Modal Skeleton with progressive loading
 */
export function EnhancedModalSkeleton({
  title,
  icon: Icon,
  size = 'default',
}: {
  title: string;
  icon?: any;
  size?: 'sm' | 'default' | 'lg';
}) {
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    const stages = [0, 1, 2, 3];
    let currentIndex = 0;

    const timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % stages.length;
      setLoadingStage(stages[currentIndex]);
    }, 600);

    return () => clearInterval(timer);
  }, []);

  const sizeClasses = {
    sm: 'max-w-md',
    default: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full p-6 transform transition-all duration-300 ${sizeClasses[size]}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center animate-pulse">
            {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
          </div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mt-2" />
          </div>
        </div>

        {/* Progressive content loading */}
        <ProgressiveContentLoader
          stages={[
            `Preparing ${title}...`,
            `Loading interface...`,
            `Finalizing setup...`,
          ]}
          className="min-h-[200px]"
        >
          {/* Form skeleton */}
          <div className="space-y-6 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`space-y-2 transition-opacity duration-500 ${
                  loadingStage >= i ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600 animate-pulse" />
              </div>
            ))}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-20 animate-pulse" />
              <div className="h-10 bg-blue-200 dark:bg-blue-800/50 rounded-lg w-24 animate-pulse" />
            </div>
          </div>
        </ProgressiveContentLoader>
      </div>
    </div>
  );
}

/**
 * Enhanced Table Loading with progressive rows
 */
export function ProgressiveTableSkeleton({
  title,
  columns = 5,
  rows = 8,
}: {
  title: string;
  columns?: number;
  rows?: number;
}) {
  const [loadedRows, setLoadedRows] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadedRows((prev) => {
        if (prev < rows) {
          return prev + 1;
        }
        return prev;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Loading {title}...
        </span>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex gap-8">
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"
                style={{ width: `${Math.random() * 60 + 80}px` }}
              />
            ))}
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={`px-6 py-4 transition-opacity duration-300 ${
                rowIndex < loadedRows ? 'opacity-100' : 'opacity-20'
              }`}
            >
              <div className="flex gap-8 items-center">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                    style={{
                      width: `${Math.random() * 80 + 60}px`,
                      animationDelay: `${colIndex * 50 + rowIndex * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Calendar View Skeleton
 */
export function ProgressiveCalendarSkeleton({
  type = 'week',
}: {
  type?: 'week' | 'month';
}) {
  const [loadedDays, setLoadedDays] = useState(0);
  const totalDays = type === 'week' ? 7 : 35;

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadedDays((prev) => {
        if (prev < totalDays) {
          return prev + 1;
        }
        return prev;
      });
    }, 80);

    return () => clearInterval(timer);
  }, [totalDays]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
      </div>

      {/* Calendar Grid */}
      <div className={`grid gap-2 ${type === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
        {Array.from({ length: totalDays }).map((_, i) => (
          <div
            key={i}
            className={`h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-2 transition-all duration-200 ${
              i < loadedDays
                ? 'opacity-100 transform scale-100'
                : 'opacity-30 transform scale-95'
            }`}
            style={{
              animationDelay: `${i * 30}ms`,
            }}
          >
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-6 animate-pulse" />
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-12 animate-pulse" />
              <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Micro-interaction loading states for buttons and small elements
 */
export function MicroLoader({
  size = 'sm',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-current opacity-75`} />
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 bg-current rounded-full opacity-60 animate-pulse"
            style={{
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}