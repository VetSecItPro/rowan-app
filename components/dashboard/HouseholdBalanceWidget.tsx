'use client';

import { Scale } from 'lucide-react';
import { HouseholdBalance } from '@/components/household-balance/HouseholdBalance';

interface HouseholdBalanceWidgetProps {
  spaceId: string;
  userId: string;
}

/**
 * Dashboard widget that promotes the existing HouseholdBalance component
 * to a top-level slot. Previously it lived inside CheckInSection's right
 * column on lg+ screens — buried behind a 2-column layout that most users
 * never noticed at first glance.
 *
 * The fairness donut is Rowan's strongest household-management differentiator:
 * "is the workload fair?" is the universal household question, and we have
 * the visualization that answers it. Putting it above the fold is the point.
 *
 * Empty-state behavior is handled by the underlying HouseholdBalance:
 * when totalCompletions === 0 it renders a "complete some tasks together"
 * message rather than a misleading donut.
 */
export function HouseholdBalanceWidget({ spaceId, userId }: HouseholdBalanceWidgetProps) {
  return (
    <section
      aria-label="Household balance"
      className="bg-gradient-to-br from-slate-900/30 via-gray-900/20 to-stone-900/10 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-500/20 hover:border-gray-400/40 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-teal-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">
          Household Balance
        </h2>
      </div>
      <HouseholdBalance spaceId={spaceId} userId={userId} />
    </section>
  );
}
