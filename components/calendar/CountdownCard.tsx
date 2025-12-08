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
 * Supports both calendar events and important dates
 * Square-ish design with prominent countdown number or emoji
 */
export function CountdownCard({ countdown, onClick }: CountdownCardProps) {
  const { label, isToday, daysRemaining, source, emoji, dateType } = countdown;

  // Check if this is an important date
  const isImportantDate = source === 'important_date';

  // Generate gradient colors based on source and days remaining
  const gradientStyle = useMemo(() => {
    if (isToday) {
      return {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        darkBackground: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      };
    }

    // Important date-specific colors based on type
    if (isImportantDate && dateType) {
      switch (dateType) {
        case 'birthday':
          return {
            background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
            darkBackground: 'linear-gradient(135deg, #831843 0%, #9d174d 100%)',
          };
        case 'anniversary':
          return {
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            darkBackground: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          };
        case 'memorial':
          return {
            background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
            darkBackground: 'linear-gradient(135deg, #581c87 0%, #6b21a8 100%)',
          };
        case 'renewal':
          return {
            background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
            darkBackground: 'linear-gradient(135deg, #713f12 0%, #854d0e 100%)',
          };
        case 'appointment':
          return {
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            darkBackground: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
          };
        default:
          return {
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            darkBackground: 'linear-gradient(135deg, #312e81 0%, #3730a3 100%)',
          };
      }
    }

    // Default event colors based on urgency
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
  }, [isToday, daysRemaining, isImportantDate, dateType]);

  // Format the date - short format
  const displayDate = useMemo(() => {
    const date = countdown.targetDate;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [countdown.targetDate]);

  // Get text color based on state
  const textColorClass = useMemo(() => {
    if (isToday) return 'text-amber-700 dark:text-amber-300';

    if (isImportantDate && dateType) {
      switch (dateType) {
        case 'birthday':
          return 'text-pink-700 dark:text-pink-300';
        case 'anniversary':
          return 'text-red-700 dark:text-red-300';
        case 'memorial':
          return 'text-purple-700 dark:text-purple-300';
        case 'renewal':
          return 'text-amber-700 dark:text-amber-300';
        case 'appointment':
          return 'text-sky-700 dark:text-sky-300';
        default:
          return 'text-indigo-700 dark:text-indigo-300';
      }
    }

    if (daysRemaining <= 3) return 'text-red-700 dark:text-red-300';
    if (daysRemaining <= 7) return 'text-purple-700 dark:text-purple-300';
    return 'text-sky-700 dark:text-sky-300';
  }, [isToday, daysRemaining, isImportantDate, dateType]);

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
        {/* Top row: emoji (for important dates) or countdown number */}
        <div className="flex items-center gap-1">
          {isToday && (
            <Sparkles className="h-4 w-4 animate-pulse text-amber-600 dark:text-amber-400" />
          )}
          {isImportantDate && emoji ? (
            <span className="text-2xl">{emoji}</span>
          ) : (
            <span className={`text-2xl font-bold ${textColorClass}`}>
              {isToday ? 'Today' : daysRemaining}
            </span>
          )}
        </div>

        {/* Days label - show for important dates with emoji, or non-today events */}
        {isImportantDate && emoji ? (
          <span className={`text-lg font-bold ${textColorClass}`}>
            {isToday ? 'Today!' : daysRemaining === 1 ? '1 day' : `${daysRemaining} days`}
          </span>
        ) : (
          !isToday && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
              {daysRemaining === 1 ? 'day' : 'days'}
            </span>
          )
        )}

        {/* Label - truncated */}
        <p className="mt-1.5 w-full truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </p>

        {/* Date */}
        <p className="text-[10px] text-gray-500 dark:text-gray-400">{displayDate}</p>
      </div>
    </button>
  );
}
