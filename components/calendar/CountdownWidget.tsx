'use client';

import { useEffect, useState, useCallback } from 'react';
import { Timer, CalendarPlus, RefreshCw } from 'lucide-react';
import { CountdownCard } from './CountdownCard';
import { countdownService, type CountdownItem } from '@/lib/services/calendar/countdown-service';

interface CountdownWidgetProps {
  spaceId: string;
  maxItems?: number;
  showHeader?: boolean;
  onEventClick?: (eventId: string) => void;
  onAddCountdown?: () => void;
}

/**
 * Dashboard widget displaying upcoming event countdowns
 * Compact grid layout - 2x2 on desktop, stacked on mobile
 */
export function CountdownWidget({
  spaceId,
  maxItems = 4,
  showHeader = true,
  onEventClick,
  onAddCountdown,
}: CountdownWidgetProps) {
  const [countdowns, setCountdowns] = useState<CountdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountdowns = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    setError(null);

    const result = await countdownService.getActiveCountdowns(spaceId, maxItems);

    if (result.error) {
      setError(result.error);
    } else {
      setCountdowns(result.countdowns);
    }

    setIsLoading(false);
  }, [spaceId, maxItems]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCountdowns();

    // Refresh every minute to keep countdowns accurate
    const interval = setInterval(fetchCountdowns, 60000);
    return () => clearInterval(interval);
  }, [fetchCountdowns]);

  const handleEventClick = (countdown: CountdownItem) => {
    if (onEventClick) {
      // For events, pass the event ID; for important dates, pass the extracted ID
      if (countdown.source === 'event' && countdown.event) {
        onEventClick(countdown.event.id);
      } else if (countdown.source === 'important_date') {
        // Extract the original ID from "important_date_<uuid>"
        const dateId = countdown.id.replace('important_date_', '');
        onEventClick(dateId);
      }
    }
  };

  // Loading skeleton - grid layout
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
        {showHeader && (
          <div className="mb-3 flex items-center justify-between">
            <div className="h-5 w-28 animate-pulse rounded-lg bg-gray-700" />
            <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-700" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-800"
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
            <Timer className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Countdowns</h3>
          </div>
        )}
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchCountdowns}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors bg-red-900/30 hover:bg-red-900/50"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  // Empty state - compact
  if (countdowns.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 p-4 to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">No upcoming countdowns</span>
          </div>
          {onAddCountdown && (
            <button
              onClick={onAddCountdown}
              className="flex items-center gap-1.5 rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors bg-purple-900/30 hover:bg-purple-900/50"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <Timer className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold">Upcoming Events</h3>
            <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium bg-purple-900/30 text-purple-400">
              {countdowns.length}
            </span>
          </div>
          {onAddCountdown && (
            <div className="relative group">
              <button
                onClick={onAddCountdown}
                className="flex items-center gap-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-purple-400"
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              <span className="absolute right-0 top-full mt-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Add countdown
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid layout: 2 cols on mobile, 3 cols on sm, 6 cols on lg */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {countdowns.map((countdown) => (
          <CountdownCard
            key={countdown.id}
            countdown={countdown}
            onClick={() => handleEventClick(countdown)}
          />
        ))}
      </div>
    </div>
  );
}
