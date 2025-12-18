'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface CollapsibleStatsGridProps {
  /** Icon component to display in the toggle button */
  icon: LucideIcon;
  /** Title for the stats section */
  title: string;
  /** Summary text shown in collapsed state (e.g., "5 pending • 3 active") */
  summary: string;
  /** Gradient class for the icon background (e.g., "bg-gradient-tasks") */
  iconGradient: string;
  /** The stats cards to render */
  children: ReactNode;
  /** Additional CSS classes for the grid container */
  gridClassName?: string;
  /** Default collapsed state on mobile (default: true) */
  defaultCollapsed?: boolean;
}

/**
 * CollapsibleStatsGrid - Mobile-optimized stats grid with accordion behavior
 *
 * On mobile: Shows a collapsed toggle button with summary, expandable to show full stats
 * On desktop: Always shows the full stats grid
 *
 * Usage:
 * ```tsx
 * <CollapsibleStatsGrid
 *   icon={CheckSquare}
 *   title="Stats Overview"
 *   summary={`${stats.pending} pending • ${stats.inProgress} active`}
 *   iconGradient="bg-gradient-tasks"
 * >
 *   <div className="stat-card">...</div>
 *   <div className="stat-card">...</div>
 * </CollapsibleStatsGrid>
 * ```
 */
export function CollapsibleStatsGrid({
  icon: Icon,
  title,
  summary,
  iconGradient,
  children,
  gridClassName = 'stats-grid-mobile gap-4 sm:gap-6',
  defaultCollapsed = true,
}: CollapsibleStatsGridProps) {
  const [mobileCollapsed, setMobileCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-3">
      {/* Mobile toggle button - only visible on mobile */}
      <button
        onClick={() => setMobileCollapsed(!mobileCollapsed)}
        className="sm:hidden w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl active:scale-[0.98] transition-all"
        aria-expanded={!mobileCollapsed}
        aria-label={mobileCollapsed ? `Expand ${title}` : `Collapse ${title}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${iconGradient} rounded-lg flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {summary}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
              {mobileCollapsed ? 'Tap to view all stats' : 'Tap to collapse'}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            mobileCollapsed ? '' : 'rotate-180'
          }`}
        />
      </button>

      {/* Stats cards - hidden on mobile when collapsed, always visible on desktop */}
      <div className={`${gridClassName} ${mobileCollapsed ? 'hidden sm:grid' : 'grid'}`}>
        {children}
      </div>
    </div>
  );
}

export default CollapsibleStatsGrid;
