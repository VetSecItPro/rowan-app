'use client';

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Receipt, Target, FileText, Plus, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BudgetTabBar } from '@/components/budget/BudgetTabBar';
import { BudgetProgressBar } from '@/components/budget/BudgetProgressBar';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { SafeToSpendIndicator } from '@/components/projects/SafeToSpendIndicator';
import {
  LazySpendingInsightsCard,
  LazyNewBudgetModal,
  LazyBudgetTemplateModal,
} from '@/lib/utils/lazy-components';
import { useBudgetData } from '@/lib/hooks/useBudgetData';
import { getBillStats, type BillStats } from '@/lib/services/bills-service';
import { logger } from '@/lib/logger';

/**
 * Budget hub home (PR14). Consolidates everything the former /projects budgets
 * tab did - safe-to-spend, the over-budget progress bar, set-budget + template
 * actions, and spending insights - onto the canonical /budget route, plus the
 * at-a-glance stat cards and quick links to the other budget sub-views. This is
 * the single household-finance home a family member lands on.
 */
export default function BudgetOverviewClient() {
  const {
    currentSpace,
    loading,
    currentBudget,
    budgetStats,
    budgetTemplates,
    templateCategories,
    setBudget,
    applyTemplate,
  } = useBudgetData();

  const [billStats, setBillStats] = useState<BillStats | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  useEffect(() => {
    if (!currentSpace) return;
    getBillStats(currentSpace.id)
      .then(setBillStats)
      .catch((err) => logger.error('Failed to load bill stats:', err, { component: 'budget-overview', action: 'load_bills' }));
  }, [currentSpace]);

  const spentPercentage =
    budgetStats.monthlyBudget > 0
      ? Math.round((budgetStats.spentThisMonth / budgetStats.monthlyBudget) * 100)
      : 0;

  const hasBudget = budgetStats.monthlyBudget > 0;

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Budget' }]}>
      <BudgetTabBar />

      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent mb-2">
              Budget Overview
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Track your household spending, manage budgets, and stay on top of your finances
            </p>
          </div>

          {/* Safe-to-spend (the single most useful day-to-day number) */}
          {!loading && currentSpace && hasBudget && <SafeToSpendIndicator spaceId={currentSpace.id} />}

          {/* Budget actions */}
          {!loading && (
            <div className="flex items-center justify-center gap-3">
              <CTAButton onClick={() => setIsTemplateModalOpen(true)} feature="projects" size="sm" icon={<FileText className="w-4 h-4" />}>
                Use Template
              </CTAButton>
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all inline-flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {hasBudget ? 'Update Budget' : 'Set Budget'}
              </button>
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
              <StatCard icon={Wallet} gradient="from-amber-500 to-yellow-500" value={`$${budgetStats.monthlyBudget.toLocaleString()}`} label="Monthly Budget" />
              <StatCard icon={TrendingUp} gradient="from-green-500 to-emerald-500" value={`${spentPercentage}%`} label="Budget Used" />
              <StatCard icon={Receipt} gradient="from-blue-500 to-blue-600" value={billStats?.totalAmountDue ? `$${billStats.totalAmountDue.toLocaleString()}` : '$0'} label="Bills Due" />
              <StatCard icon={Target} gradient="from-purple-500 to-purple-600" value={`$${Math.max(0, budgetStats.remaining).toLocaleString()}`} label="Remaining" />
            </CollapsibleStatsGrid>
          )}

          {/* Spending progress (with over-budget visualization) */}
          {!loading && hasBudget && (
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 className="text-white font-medium mb-3">Monthly Spending</h3>
              <BudgetProgressBar monthlyBudget={budgetStats.monthlyBudget} spentThisMonth={budgetStats.spentThisMonth} />
              {budgetStats.pendingBills > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {budgetStats.pendingBills} pending bill{budgetStats.pendingBills !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Spending insights */}
          {!loading && currentSpace && hasBudget && (
            <LazySpendingInsightsCard spaceId={currentSpace.id} />
          )}

          {/* Quick links to sub-views */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Expenses', href: '/budget/expenses', icon: DollarSign, gradient: 'from-amber-500 to-amber-600' },
                { label: 'Bills', href: '/budget/bills', icon: Receipt, gradient: 'from-orange-500 to-orange-600' },
                { label: 'Recurring', href: '/budget/recurring', icon: TrendingUp, gradient: 'from-purple-500 to-purple-600' },
                { label: 'Receipts', href: '/budget/receipts', icon: FileText, gradient: 'from-pink-500 to-pink-600' },
                { label: 'Vendors', href: '/budget/vendors', icon: Receipt, gradient: 'from-blue-500 to-blue-600' },
                { label: 'Goals', href: '/budget/goals', icon: Target, gradient: 'from-indigo-500 to-indigo-600' },
              ].map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div key={action.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Link
                      href={action.href}
                      className="block bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg group text-center"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading budget data...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !hasBudget && (
            <div className="text-center py-12 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Budget Set Yet</h3>
              <p className="text-gray-400 mb-4">Set your monthly budget or start from a template to begin tracking</p>
              <div className="flex items-center justify-center gap-3">
                <CTAButton onClick={() => setIsTemplateModalOpen(true)} feature="projects" icon={<FileText className="w-4 h-4" />} className="!rounded-full">
                  Use Template
                </CTAButton>
                <button onClick={() => setIsBudgetModalOpen(true)} className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all inline-flex items-center gap-2 text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Set Custom
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {currentSpace && (
        <>
          <LazyNewBudgetModal
            isOpen={isBudgetModalOpen}
            onClose={() => setIsBudgetModalOpen(false)}
            onSave={(amount: number) => {
              setBudget(amount);
              setIsBudgetModalOpen(false);
            }}
            currentBudget={currentBudget}
            spaceId={currentSpace.id}
          />
          <LazyBudgetTemplateModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            onApply={async (templateId: string, monthlyIncome: number) => {
              await applyTemplate(templateId, monthlyIncome);
              setIsTemplateModalOpen(false);
            }}
            templates={budgetTemplates}
            templateCategories={templateCategories}
          />
        </>
      )}
    </FeatureLayout>
  );
}

function StatCard({ icon: Icon, gradient, value, label }: { icon: typeof Wallet; gradient: string; value: string; label: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-400">{label}</h3>
    </div>
  );
}
