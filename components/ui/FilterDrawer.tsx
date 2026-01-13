'use client';

import { useState, useCallback } from 'react';
import { Filter, Check, RotateCcw, X } from 'lucide-react';
import { BottomSheet, useBottomSheet } from './BottomSheet';
import { useDevice } from '@/lib/contexts/DeviceContext';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'single' | 'multiple' | 'range';
  options: FilterOption[];
}

export interface FilterValues {
  [groupId: string]: string | string[] | [number, number];
}

interface FilterDrawerProps {
  /** Filter groups configuration */
  groups: FilterGroup[];
  /** Current filter values */
  values: FilterValues;
  /** Callback when filters change */
  onChange: (values: FilterValues) => void;
  /** Callback when filters are applied (for mobile bottom sheet) */
  onApply?: () => void;
  /** Title for the drawer */
  title?: string;
  /** Show active filter count badge */
  showBadge?: boolean;
  /** Custom trigger button render */
  renderTrigger?: (props: { onClick: () => void; activeCount: number }) => React.ReactNode;
}

/**
 * Responsive filter component that shows inline on desktop
 * and as a bottom sheet drawer on mobile.
 *
 * Features:
 * - Automatic responsive behavior (desktop inline, mobile drawer)
 * - Single and multiple selection support
 * - Active filter count badge
 * - Clear filters functionality
 * - Touch-friendly targets
 */
export function FilterDrawer({
  groups,
  values,
  onChange,
  onApply,
  title = 'Filters',
  showBadge = true,
  renderTrigger,
}: FilterDrawerProps) {
  const { isMobile } = useDevice();
  const { isOpen, open, close } = useBottomSheet();

  // Count active filters
  const activeCount = Object.entries(values).reduce((count, [, value]) => {
    if (Array.isArray(value)) {
      return count + value.length;
    }
    if (value && value !== 'all') {
      return count + 1;
    }
    return count;
  }, 0);

  // Handle single select change
  const handleSingleChange = useCallback(
    (groupId: string, value: string) => {
      onChange({ ...values, [groupId]: value });
    },
    [onChange, values]
  );

  // Handle multiple select toggle
  const handleMultipleToggle = useCallback(
    (groupId: string, value: string) => {
      const current = (values[groupId] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onChange({ ...values, [groupId]: updated });
    },
    [onChange, values]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    const cleared: FilterValues = {};
    groups.forEach((group) => {
      if (group.type === 'multiple') {
        cleared[group.id] = [];
      } else {
        cleared[group.id] = 'all';
      }
    });
    onChange(cleared);
  }, [groups, onChange]);

  // Render filter content
  const renderFilters = () => (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {group.label}
          </h3>

          {group.type === 'single' && (
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isSelected = values[group.id] === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSingleChange(group.id, option.value)}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2.5
                      rounded-full text-sm font-medium
                      transition-all duration-200
                      min-h-[44px] touch-manipulation
                      ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span
                        className={`
                          ml-1 text-xs
                          ${isSelected ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}
                        `}
                      >
                        ({option.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {group.type === 'multiple' && (
            <div className="space-y-2">
              {group.options.map((option) => {
                const isSelected = ((values[group.id] as string[]) || []).includes(
                  option.value
                );
                return (
                  <button
                    key={option.value}
                    onClick={() => handleMultipleToggle(group.id, option.value)}
                    className={`
                      w-full flex items-center justify-between
                      px-4 py-3 rounded-xl
                      text-left text-sm font-medium
                      transition-all duration-200
                      min-h-[48px] touch-manipulation
                      ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                          : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <span
                        className={
                          isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }
                      >
                        {option.label}
                      </span>
                      {option.count !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({option.count})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Clear all button */}
      {activeCount > 0 && (
        <button
          onClick={handleClearAll}
          className="
            flex items-center gap-2 px-4 py-2.5
            text-sm font-medium text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
            transition-colors
            min-h-[44px] touch-manipulation
          "
        >
          <RotateCcw className="w-4 h-4" />
          Clear all filters
        </button>
      )}
    </div>
  );

  // Default trigger button
  const defaultTrigger = (
    <button
      onClick={open}
      className="
        inline-flex items-center gap-2 px-4 py-2.5
        bg-gray-100 dark:bg-gray-800
        text-gray-700 dark:text-gray-300
        rounded-xl font-medium text-sm
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-colors
        min-h-[44px] touch-manipulation
        relative
      "
    >
      <Filter className="w-5 h-5" />
      <span className="hidden sm:inline">{title}</span>
      {showBadge && activeCount > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            w-5 h-5 rounded-full
            bg-indigo-600 text-white
            text-xs font-semibold
            flex items-center justify-center
          "
        >
          {activeCount}
        </span>
      )}
    </button>
  );

  // Mobile: Render as bottom sheet
  if (isMobile) {
    return (
      <>
        {renderTrigger
          ? renderTrigger({ onClick: open, activeCount })
          : defaultTrigger}

        <BottomSheet
          isOpen={isOpen}
          onClose={() => {
            close();
            onApply?.();
          }}
          title={title}
          height="auto"
        >
          {renderFilters()}

          {/* Apply button for mobile */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                close();
                onApply?.();
              }}
              className="
                w-full py-3.5 px-6
                bg-indigo-600 hover:bg-indigo-700
                text-white font-semibold
                rounded-xl
                transition-colors
                min-h-[48px] touch-manipulation
              "
            >
              Apply Filters
              {activeCount > 0 && ` (${activeCount})`}
            </button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // Desktop: Render inline or as dropdown
  return (
    <div className="relative inline-block">
      {/* Desktop filter pills/inline */}
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group) => (
          <div key={group.id} className="flex items-center gap-1">
            {group.type === 'single' &&
              group.options.map((option) => {
                const isSelected = values[group.id] === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSingleChange(group.id, option.value)}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5
                      rounded-full text-sm font-medium
                      transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {option.icon}
                    {option.label}
                    {option.count !== undefined && (
                      <span className="text-xs opacity-70">({option.count})</span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}

        {/* Clear button for desktop */}
        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="
              inline-flex items-center gap-1 px-2 py-1.5
              text-sm text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              transition-colors
            "
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage filter state
 */
export function useFilterState(initialValues: FilterValues = {}) {
  const [values, setValues] = useState<FilterValues>(initialValues);

  const updateFilter = useCallback((groupId: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [groupId]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setValues({});
  }, []);

  const getActiveCount = useCallback(() => {
    return Object.values(values).reduce((count, value) => {
      if (Array.isArray(value)) return count + value.length;
      if (value && value !== 'all') return count + 1;
      return count;
    }, 0);
  }, [values]);

  return {
    values,
    setValues,
    updateFilter,
    clearFilters,
    activeCount: getActiveCount(),
  };
}

export default FilterDrawer;
