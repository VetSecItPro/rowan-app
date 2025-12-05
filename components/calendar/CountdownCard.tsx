'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { CountdownItem } from '@/lib/services/calendar/countdown-service';

interface CountdownCardProps {
  countdown: CountdownItem;
  onClick?: () => void;
}

/**
 * Compact countdown card for grid display
 * Square-ish design with prominent countdown number
 */
export function CountdownCard({ countdown, onClick }: CountdownCardProps) {
  const { label, isToday, daysRemaining } = countdown;

  // Generate gradient colors based on days remaining
  const gradientStyle = useMemo(() => {
    if (isToday) {
      return {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        darkBackground: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      };
    }

    if (daysRemaining <= 3) {
      return {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        darkBackground: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
      };
    }

    if (daysRemaining <= 7) {
      return {
        background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
        darkBackground: 'linear-gradient(135deg, #581c87 0%, #6b21a8 100%)',
      };
    }

    return {
      background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      darkBackground: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    };
  }, [isToday, daysRemaining]);

  // Format the event date - short format
  const eventDate = useMemo(() => {
    const date = new Date(countdown.event.start_time);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [countdown.event.start_time]);

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-gray-200/50 p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md dark:border-gray-700/50"
      style={{ background: gradientStyle.background }}
    >
      {/* Dark mode overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-100"
        style={{ background: gradientStyle.darkBackground }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Countdown number - prominent */}
        <div className="flex items-center gap-1">
          {isToday && (
            <Sparkles className="h-4 w-4 animate-pulse text-amber-600 dark:text-amber-400" />
          )}
          <span
            className={`text-2xl font-bold ${
              isToday
                ? 'text-amber-700 dark:text-amber-300'
                : daysRemaining <= 3
                  ? 'text-red-700 dark:text-red-300'
                  : daysRemaining <= 7
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-sky-700 dark:text-sky-300'
            }`}
          >
            {isToday ? 'Today' : daysRemaining}
          </span>
        </div>

        {/* Days label (if not today) */}
        {!isToday && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {daysRemaining === 1 ? 'day' : 'days'}
          </span>
        )}

        {/* Event label - truncated */}
        <p className="mt-1.5 w-full truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </p>

        {/* Date */}
        <p className="text-[10px] text-gray-500 dark:text-gray-400">{eventDate}</p>
      </div>
    </button>
  );
}
