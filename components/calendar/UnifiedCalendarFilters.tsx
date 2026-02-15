'use client';

// Unified Calendar Filters Component
// Phase 9: Toggle visibility of different item types on the calendar

import { memo } from 'react';
import {
  UNIFIED_ITEM_COLORS,
  UNIFIED_ITEM_ICONS,
  UNIFIED_ITEM_LABELS,
  type UnifiedCalendarFilters as FilterState,
  type UnifiedItemType,
} from '@/lib/types/unified-calendar-item';

interface UnifiedCalendarFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  counts?: Record<UnifiedItemType, number>;
  compact?: boolean;
}

/**
 * Filter toggle button component
 */
const FilterButton = memo(function FilterButton({
  type,
  isActive,
  count,
  compact,
  onClick,
}: {
  type: UnifiedItemType;
  isActive: boolean;
  count?: number;
  compact?: boolean;
  onClick: () => void;
}) {
  const colors = UNIFIED_ITEM_COLORS[type];
  const icon = UNIFIED_ITEM_ICONS[type];
  const label = UNIFIED_ITEM_LABELS[type];
  const tooltipText = isActive ? `Hide ${label.toLowerCase()}s` : `Show ${label.toLowerCase()}s`;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={`
          inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
          text-sm font-medium transition-all duration-200
          ${
            isActive
              ? `${colors.bg} ${colors.border} ${colors.text}`
              : 'border-gray-700 text-gray-400'
          }
          hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isActive ? 'focus-visible:ring-purple-500' : 'focus-visible:ring-gray-400'}
        `}
        aria-pressed={isActive}
        aria-label={tooltipText}
      >
        <span className="text-base">{icon}</span>
        {!compact && <span>{label}s</span>}
        {count !== undefined && count > 0 && (
          <span
            className={`
              ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold
              ${isActive ? 'bg-black/20' : 'bg-gray-700'}
            `}
          >
            {count}
          </span>
        )}
      </button>
      {/* Instant tooltip - no delay */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {tooltipText}
      </span>
    </div>
  );
});

/**
 * Unified Calendar Filters
 * Allows users to toggle visibility of different item types on the calendar
 */
export const UnifiedCalendarFilters = memo(function UnifiedCalendarFilters({
  filters,
  onFilterChange,
  counts,
  compact = false,
}: UnifiedCalendarFiltersProps) {
  const handleToggle = (type: UnifiedItemType) => {
    const filterKey = `show${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof FilterState;
    onFilterChange({
      ...filters,
      [filterKey]: !filters[filterKey],
    });
  };

  // All/None toggle helper
  const allEnabled = Object.values(filters).every(Boolean);
  const handleToggleAll = () => {
    const newValue = !allEnabled;
    onFilterChange({
      showEvents: newValue,
      showTasks: newValue,
      showMeals: newValue,
      showReminders: newValue,
      showGoals: newValue,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Individual type filters */}
      <FilterButton
        type="event"
        isActive={filters.showEvents}
        count={counts?.event}
        compact={compact}
        onClick={() => handleToggle('event')}
      />
      <FilterButton
        type="task"
        isActive={filters.showTasks}
        count={counts?.task}
        compact={compact}
        onClick={() => handleToggle('task')}
      />
      <FilterButton
        type="meal"
        isActive={filters.showMeals}
        count={counts?.meal}
        compact={compact}
        onClick={() => handleToggle('meal')}
      />
      <FilterButton
        type="reminder"
        isActive={filters.showReminders}
        count={counts?.reminder}
        compact={compact}
        onClick={() => handleToggle('reminder')}
      />

      {/* Divider */}
      <div className="mx-1 h-6 w-px bg-gray-700" />

      {/* All/None toggle with instant tooltip */}
      <div className="group relative">
        <button
          type="button"
          onClick={handleToggleAll}
          className={`
            inline-flex items-center rounded-md px-2 py-1 text-xs font-medium
            transition-colors duration-200
            ${
              allEnabled
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
            }
          `}
          aria-label={allEnabled ? 'Hide all item types from calendar' : 'Show all item types on calendar'}
        >
          {allEnabled ? 'Hide All' : 'Show All'}
        </button>
        {/* Instant tooltip - no delay */}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {allEnabled ? 'Hide all item types from calendar' : 'Show all item types on calendar'}
        </span>
      </div>
    </div>
  );
});

export default UnifiedCalendarFilters;
