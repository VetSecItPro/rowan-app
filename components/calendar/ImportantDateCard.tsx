'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { ImportantDateWithMeta } from '@/lib/types/important-dates';

interface ImportantDateCardProps {
  date: ImportantDateWithMeta;
  onClick?: () => void;
}

/**
 * Compact card for displaying an important date
 * Similar to CountdownCard but with date-specific styling
 */
export function ImportantDateCard({ date, onClick }: ImportantDateCardProps) {
  const { title, person_name, date_type, emoji, days_until, years, is_today } = date;

  // Generate gradient colors based on date type and urgency
  const gradientStyle = useMemo(() => {
    if (is_today) {
      return {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        darkBackground: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
      };
    }

    // Color by date type
    switch (date_type) {
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
  }, [is_today, date_type]);

  // Format the next occurrence date
  const nextDate = useMemo(() => {
    const d = new Date(date.next_occurrence);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [date.next_occurrence]);

  // Display name: prefer person_name, fallback to title
  const displayName = person_name || title;

  // Years display (age or anniversary number)
  const yearsDisplay = useMemo(() => {
    if (!years) return null;
    if (date_type === 'birthday') {
      return `Turning ${years}`;
    }
    if (date_type === 'anniversary') {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }, [years, date_type]);

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-gray-200/50 p-3 text-left transition-all duration-200 hover:scale-[1.02] border-gray-700/50"
      style={{ background: gradientStyle.background }}
    >
      {/* Dark mode overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 opacity-100"
        style={{ background: gradientStyle.darkBackground }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Emoji or Icon */}
        <div className="flex items-center gap-1">
          {is_today && (
            <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
          )}
          <span className="text-2xl">{emoji}</span>
        </div>

        {/* Days until */}
        <div className="mt-1 flex items-center gap-1">
          <span
            className={`text-lg font-bold ${
              is_today
                ? 'text-amber-300'
                : days_until <= 3
                  ? 'text-red-300'
                  : days_until <= 7
                    ? 'text-purple-300'
                    : 'text-gray-300'
            }`}
          >
            {is_today ? 'Today!' : days_until === 1 ? '1 day' : `${days_until} days`}
          </span>
        </div>

        {/* Name/Title */}
        <p className="mt-1 w-full truncate text-xs font-semibold text-gray-200">
          {displayName}
        </p>

        {/* Years display if available */}
        {yearsDisplay && (
          <p className="text-[10px] font-medium text-gray-400">
            {yearsDisplay}
          </p>
        )}

        {/* Date */}
        <p className="text-[10px] text-gray-400">{nextDate}</p>
      </div>
    </button>
  );
}
