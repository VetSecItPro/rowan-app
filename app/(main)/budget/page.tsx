'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, Receipt, Target, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BudgetTabBar } from '@/components/budget/BudgetTabBar';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import { projectsService, type BudgetStats } from '@/lib/services/budgets-service';
import { getBillStats, type BillStats } from '@/lib/services/bills-service';
import Link from 'next/link';

export default function BudgetOverviewPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  const [budgetStats, setBudgetStats] = useState<BudgetStats>({
    monthlyBudget: 0,
    spentThisMonth: 0,
    remaining: 0,
    pendingBills: 0,
  });
  const [billStats, setBillStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverviewData = useCallback(async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const [stats, bills] = await Promise.all([
        projectsService.getBudgetStats(spaceId).catch(() => ({
          monthlyBudget: 0,
          spentThisMonth: 0,
          remaining: 0,
          pendingBills: 0,
        })),
        getBillStats(spaceId).catch(() => null),
      ]);

      setBudgetStats(stats);
      setBillStats(bills);
    } catch (err) {
      logger.error('Failed to load budget overview:', err, {
        component: 'page',
        action: 'execution',
      });
      setError('Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  const spentPercentage =
    budgetStats.monthlyBudget > 0
      ? Math.round((budgetStats.spentThisMonth / budgetStats.monthlyBudget) * 100)
      : 0;

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget' },
      ]}
    >
      <BudgetTabBar />

      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent mb-2">
              Budget Overview
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Track your household spending, manage budgets, and stay on top of
              your finances
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border-2 border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          {!loading && (
            <CollapsibleStatsGrid
              icon={Wallet}
              title="Budget Summary"
              summary={`$${budgetStats.spentThisMonth.toLocaleString()} of $${budgetStats.monthlyBudget.toLocaleString()} spent this month`}
              iconGradient="bg-gradient-to-br from-amber-500 to-yellow-500"
              gridClassName="grid stats-grid-mobile gap-6"
            >
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">
                    ${budgetStats.monthlyBudget.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-400">
                  Monthly Budget
                </h3>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {spentPercentage}%
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-400">
                  Budget Used
                </h3>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {billStats?.totalAmountDue
                      ? `$${billStats.totalAmountDue.toLocaleString()}`
                      : '$0'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-400">
                  Bills Due
                </h3>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">
                    ${Math.max(0, budgetStats.remaining).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-400">
                  Remaining
                </h3>
              </div>
            </CollapsibleStatsGrid>
          )}

          {/* Spending Progress Bar */}
          {!loading && budgetStats.monthlyBudget > 0 && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium">Monthly Spending</h3>
                <span
                  className={`text-sm font-semibold ${
                    budgetStats.remaining < 0 ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  ${budgetStats.spentThisMonth.toLocaleString()} / $
                  {budgetStats.monthlyBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, spentPercentage)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    budgetStats.remaining < 0
                      ? 'bg-red-500'
                      : spentPercentage > 80
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {spentPercentage}% of budget used
                {budgetStats.pendingBills > 0 &&
                  ` · ${budgetStats.pendingBills} pending bill${budgetStats.pendingBills !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Manage Bills',
                  description: 'Track due dates and payments',
                  href: '/budget/bills',
                  icon: Receipt,
                  gradient: 'from-amber-500 to-amber-600',
                },
                {
                  label: 'Recurring Expenses',
                  description: 'Monitor subscriptions',
                  href: '/budget/recurring',
                  icon: TrendingUp,
                  gradient: 'from-purple-500 to-purple-600',
                },
                {
                  label: 'Budget Goals',
                  description: 'Track savings progress',
                  href: '/budget/goals',
                  icon: Target,
                  gradient: 'from-indigo-500 to-indigo-600',
                },
                {
                  label: 'Vendors',
                  description: 'Manage service providers',
                  href: '/budget/vendors',
                  icon: Receipt,
                  gradient: 'from-blue-500 to-blue-600',
                },
              ].map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={action.href}
                      className="block bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg group"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {action.label}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {action.description}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading budget data...</p>
            </div>
          )}

          {/* Empty state when no budget is set */}
          {!loading && budgetStats.monthlyBudget === 0 && (
            <div className="text-center py-12 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No Budget Set Yet
              </h3>
              <p className="text-gray-400 mb-4">
                Set your monthly budget to start tracking expenses
              </p>
            </div>
          )}
        </div>
      </div>
    </FeatureLayout>
  );
}
