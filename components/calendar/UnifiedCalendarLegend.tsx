'use client';

// Unified Calendar Legend Component
// Phase 9: Color legend showing what each item type color represents

import { memo } from 'react';
import {
  UNIFIED_ITEM_COLORS,
  UNIFIED_ITEM_ICONS,
  UNIFIED_ITEM_LABELS,
  type UnifiedItemType,
} from '@/lib/types/unified-calendar-item';

interface UnifiedCalendarLegendProps {
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Show icons */
  showIcons?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Legend item component
 */
const LegendItem = memo(function LegendItem({
  type,
  showIcon,
}: {
  type: UnifiedItemType;
  showIcon: boolean;
}) {
  const colors = UNIFIED_ITEM_COLORS[type];
  const icon = UNIFIED_ITEM_ICONS[type];
  const label = UNIFIED_ITEM_LABELS[type];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${colors.dot}`} />
      {showIcon && <span className="text-sm">{icon}</span>}
      <span className="text-xs text-gray-400">{label}s</span>
    </div>
  );
});

/**
 * Unified Calendar Legend
 * Shows color coding for different item types
 */
export const UnifiedCalendarLegend = memo(function UnifiedCalendarLegend({
  orientation = 'horizontal',
  showIcons = true,
  className = '',
}: UnifiedCalendarLegendProps) {
  const itemTypes: UnifiedItemType[] = ['event', 'task', 'meal', 'reminder'];

  return (
    <div
      className={`
        flex gap-4
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center'}
        ${className}
      `}
    >
      {itemTypes.map((type) => (
        <LegendItem key={type} type={type} showIcon={showIcons} />
      ))}
    </div>
  );
});

/**
 * Compact legend as a popover trigger
 */
export const UnifiedCalendarLegendCompact = memo(function UnifiedCalendarLegendCompact({
  className = '',
}: {
  className?: string;
}) {
  const itemTypes: UnifiedItemType[] = ['event', 'task', 'meal', 'reminder'];

  return (
    <div
      className={`group relative inline-flex items-center gap-1 ${className}`}
      title="Calendar item types"
    >
      {/* Stacked dots */}
      <div className="flex -space-x-0.5">
        {itemTypes.map((type) => (
          <div
            key={type}
            className={`h-2.5 w-2.5 rounded-full border border-gray-900 ${UNIFIED_ITEM_COLORS[type].dot}`}
          />
        ))}
      </div>

      {/* Hover popover */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-32 rounded-md border border-gray-700 bg-gray-800 p-2 shadow-lg group-hover:block">
        <div className="flex flex-col gap-1.5">
          {itemTypes.map((type) => (
            <LegendItem key={type} type={type} showIcon={true} />
          ))}
        </div>
      </div>
    </div>
  );
});

export default UnifiedCalendarLegend;
