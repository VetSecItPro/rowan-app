'use client';

import { useEffect, useState, useCallback } from 'react';
import { Cake, Plus, RefreshCw } from 'lucide-react';
import { ImportantDateCard } from './ImportantDateCard';
import { importantDatesService } from '@/lib/services/calendar/important-dates-service';
import type { ImportantDateWithMeta } from '@/lib/types/important-dates';

interface ImportantDatesWidgetProps {
  spaceId: string;
  maxItems?: number;
  upcomingDays?: number;
  showHeader?: boolean;
  onDateClick?: (dateId: string) => void;
  onAddDate?: () => void;
}

/**
 * Dashboard widget displaying upcoming important dates
 * Shows birthdays, anniversaries, and other recurring dates
 * Compact grid layout - 2x2 on desktop, stacked on mobile
 */
export function ImportantDatesWidget({
  spaceId,
  maxItems = 4,
  upcomingDays = 30,
  showHeader = true,
  onDateClick,
  onAddDate,
}: ImportantDatesWidgetProps) {
  const [dates, setDates] = useState<ImportantDateWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDates = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    setError(null);

    const result = await importantDatesService.getUpcomingDates(spaceId, upcomingDays, maxItems);

    if (result.error) {
      setError(result.error);
    } else {
      setDates(result.dates);
    }

    setIsLoading(false);
  }, [spaceId, maxItems, upcomingDays]);

  useEffect(() => {
    fetchDates();

    // Refresh every hour (dates don't change as frequently as countdowns)
    const interval = setInterval(fetchDates, 3600000);
    return () => clearInterval(interval);
  }, [fetchDates]);

  const handleDateClick = (date: ImportantDateWithMeta) => {
    if (onDateClick) {
      onDateClick(date.id);
    }
  };

  // Loading skeleton - grid layout
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 bg-gray-900">
        {showHeader && (
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-700" />
            <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-700" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-800"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 bg-red-900/20">
        {showHeader && (
          <div className="mb-2 flex items-center gap-2 text-red-400">
            <Cake className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Important Dates</h3>
          </div>
        )}
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchDates}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors bg-red-900/30 hover:bg-red-900/50"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  // Empty state - compact
  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 p-4 to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Cake className="h-4 w-4" />
            <span className="text-sm font-medium">No upcoming dates</span>
          </div>
          {onAddDate && (
            <button
              onClick={onAddDate}
              className="flex items-center gap-1.5 rounded-lg bg-pink-100 px-3 py-1.5 text-xs font-medium text-pink-700 transition-colors bg-pink-900/30 hover:bg-pink-900/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 bg-gray-900">
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <Cake className="h-4 w-4 text-pink-400" />
            <h3 className="text-sm font-semibold">Important Dates</h3>
            <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-xs font-medium bg-pink-900/30 text-pink-400">
              {dates.length}
            </span>
          </div>
          {onAddDate && (
            <div className="relative group">
              <button
                onClick={onAddDate}
                className="flex items-center gap-1 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 text-gray-400 hover:text-pink-400"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="absolute right-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Add date
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid layout: 2 cols on mobile, 4 cols on sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dates.map((date) => (
          <ImportantDateCard
            key={date.id}
            date={date}
            onClick={() => handleDateClick(date)}
          />
        ))}
      </div>
    </div>
  );
}
