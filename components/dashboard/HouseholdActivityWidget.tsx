'use client';

import { Activity } from 'lucide-react';
import ActivityFeed from '@/components/comments/ActivityFeed';

interface HouseholdActivityWidgetProps {
  spaceId: string;
}

/**
 * Dashboard widget that surfaces recent household activity.
 *
 * Reuses the universal `ActivityFeed` (sourced from the `activity_logs`
 * table, scoped by space_id) and wraps it in a dashboard-styled card.
 *
 * Multi-user value moment: when a partner completes a chore or adds an
 * event, it shows up here in real-time. Without this widget the shared
 * household experience is invisible until a user navigates to a feature
 * detail page.
 *
 * The underlying ActivityFeed handles its own loading, empty, error, and
 * realtime-subscription states. We just give it a card chrome.
 */
export function HouseholdActivityWidget({ spaceId }: HouseholdActivityWidgetProps) {
  return (
    <section
      aria-label="Household activity"
      className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4 sm:p-5"
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Household Activity
            </h2>
            <p className="text-xs text-gray-400">
              What everyone&apos;s been up to
            </p>
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-gray-400"
          title="Updates live as your household uses Rowan"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </header>
      <ActivityFeed spaceId={spaceId} limit={6} showStats={false} />
    </section>
  );
}
