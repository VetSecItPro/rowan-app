'use client';

// Unified Calendar Item Card Component
// Phase 9: Renders a single unified calendar item (event, task, meal, or reminder)

import { memo } from 'react';
import {
  UNIFIED_ITEM_COLORS,
  UNIFIED_ITEM_ICONS,
  type UnifiedCalendarItem,
} from '@/lib/types/unified-calendar-item';

interface UnifiedCalendarItemCardProps {
  item: UnifiedCalendarItem;
  /** Compact mode for week/month view */
  compact?: boolean;
  /** Click handler */
  onClick?: (item: UnifiedCalendarItem) => void;
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format time range for display
 */
function formatTimeRange(startTime: string, endTime?: string): string {
  const start = formatTime(startTime);
  if (!endTime) return start;
  const end = formatTime(endTime);
  return `${start} - ${end}`;
}

/**
 * Get status indicator styles
 */
function getStatusStyles(status?: string, itemType?: string): string {
  if (itemType === 'task') {
    switch (status) {
      case 'completed':
        return 'line-through opacity-60';
      case 'blocked':
      case 'on-hold':
        return 'opacity-75';
      default:
        return '';
    }
  }
  if (itemType === 'reminder') {
    return status === 'completed' ? 'line-through opacity-60' : '';
  }
  return '';
}

/**
 * Unified Calendar Item Card
 * Renders a calendar item with appropriate styling based on item type
 */
export const UnifiedCalendarItemCard = memo(function UnifiedCalendarItemCard({
  item,
  compact = false,
  onClick,
}: UnifiedCalendarItemCardProps) {
  const colors = UNIFIED_ITEM_COLORS[item.itemType];
  const icon = UNIFIED_ITEM_ICONS[item.itemType];
  const statusStyles = getStatusStyles(item.status, item.itemType);

  // Use custom color if provided, otherwise use type color
  const customColorStyle = item.customColor
    ? { backgroundColor: `${item.customColor}20`, borderColor: item.customColor }
    : {};

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  if (compact) {
    // Compact view for week/month calendar cells
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`
          group flex w-full items-center gap-1 rounded px-1.5 py-0.5
          text-left text-xs transition-opacity
          ${colors.bg} ${colors.border} ${colors.text}
          border hover:opacity-80
          ${statusStyles}
        `}
        style={customColorStyle}
        title={`${item.title}${item.isAllDay ? ' (All day)' : ` at ${formatTime(item.startTime)}`}`}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate font-medium">{item.title}</span>
        {item.priority === 'high' || item.priority === 'urgent' ? (
          <span className="flex-shrink-0 text-red-500">!</span>
        ) : null}
      </button>
    );
  }

  // Full view for day/agenda views
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group flex w-full flex-col gap-1 rounded-lg border p-3
        text-left transition-all hover:shadow-md
        ${colors.bg} ${colors.border}
        ${statusStyles}
      `}
      style={customColorStyle}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className={`font-medium ${colors.text}`}>{item.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {item.priority === 'urgent' && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium bg-red-900/30 text-red-300">
              Urgent
            </span>
          )}
          {item.priority === 'high' && (
            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium bg-orange-900/30 text-orange-300">
              High
            </span>
          )}
          {item.isRecurring && (
            <span className="text-gray-400" title="Recurring">
              &#8634;
            </span>
          )}
        </div>
      </div>

      {/* Time row */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {item.isAllDay ? (
          <span>All day</span>
        ) : (
          <span>{formatTimeRange(item.startTime, item.endTime)}</span>
        )}
        {item.location && (
          <>
            <span className="text-gray-600">|</span>
            <span className="truncate">{item.location}</span>
          </>
        )}
      </div>

      {/* Description preview */}
      {item.description && (
        <p className="line-clamp-2 text-sm text-gray-400">{item.description}</p>
      )}

      {/* Item-specific metadata */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {/* Meal type */}
        {item.itemType === 'meal' && item.category && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 capitalize">
            {item.category}
          </span>
        )}

        {/* Task/Reminder status */}
        {(item.itemType === 'task' || item.itemType === 'reminder') && item.status && (
          <span
            className={`rounded px-1.5 py-0.5 capitalize ${
              item.status === 'completed'
                ? 'bg-green-900/30 text-green-300'
                : item.status === 'blocked'
                ? 'bg-red-900/30 text-red-300'
                : 'bg-gray-800'
            }`}
          >
            {item.status.replace('-', ' ')}
          </span>
        )}

        {/* Category */}
        {item.category && item.itemType !== 'meal' && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 capitalize">
            {item.category}
          </span>
        )}
      </div>
    </button>
  );
});

export default UnifiedCalendarItemCard;
