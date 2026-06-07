'use client';

import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';

/**
 * Gate the entire `/budget` hub (overview, expenses, bills, recurring, receipts,
 * vendors, goals) behind the `household` feature.
 *
 * `household` is configured as a Plus-tier feature (feature-access-service:
 * `household: 'plus'`), and the legacy `/expenses` page gated it — but the
 * canonical `/budget` hub, which the sidebar + dashboard actually link to,
 * never did. Free users could reach the full budget experience: a config-vs-
 * behavior gap surfaced by the June 2026 QA sweep (BUG-1's redirect exposed it).
 * Gating at the layout covers every `/budget/*` sub-route in one place.
 */
export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGateWrapper
      feature="household"
      title="Budget & Expenses"
      description="Track your household spending, scan receipts with AI, and manage your family budget. Upgrade to Plus to unlock this feature."
    >
      {children}
    </FeatureGateWrapper>
  );
}
