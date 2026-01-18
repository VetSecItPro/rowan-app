'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

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
  return (
    <div className="hidden sm:block space-y-3">
      {/* Stats cards - hidden on mobile, always visible on desktop */}
      <div className={`${gridClassName} grid`}>
        {children}
      </div>
    </div>
  );
}

export default CollapsibleStatsGrid;
