'use client';

import { ReactNode, useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-3">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="sm:hidden w-full flex items-center gap-3 rounded-xl border border-gray-700/60 bg-gray-900/60 px-4 py-3 text-left"
        aria-expanded={!isCollapsed}
      >
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconGradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white truncate">{title}</span>
          <span className="block text-xs text-gray-400 truncate">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Stats cards - visible on desktop, collapsible on mobile */}
      {!isCollapsed && (
        <div className={`${gridClassName} grid sm:hidden`}>
          {children}
        </div>
      )}
      <div className={`${gridClassName} hidden sm:grid`}>
        {children}
      </div>
    </div>
  );
}

export default CollapsibleStatsGrid;
