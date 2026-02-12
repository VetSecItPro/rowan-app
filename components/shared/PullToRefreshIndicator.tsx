'use client';

import { Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isVisible: boolean;
  isRefreshing: boolean;
  pullProgress: number;
}

export function PullToRefreshIndicator({
  isVisible,
  isRefreshing,
  pullProgress,
}: PullToRefreshIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullProgress * 60, 60)}px)`,
        transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      <div className="bg-gray-800/95 rounded-full px-4 py-2 shadow-lg border border-gray-700">
        <div className="flex items-center gap-2">
          <Loader2 
            className={`w-4 h-4 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: !isRefreshing ? `rotate(${pullProgress * 360}deg)` : undefined,
            }}
          />
          <span className="text-sm font-medium text-gray-300">
            {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
    </div>
  );
}
