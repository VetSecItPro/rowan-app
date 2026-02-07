'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Film,
  UtensilsCrossed,
  Lightbulb,
  Receipt,
} from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* ── Step 1: Monthly overview (stats grid + progress bar) ────────── */
function MonthlyOverviewStep() {
  const spent = 1850;
  const total = 3200;
  const remaining = total - spent;
  const percent = Math.round((spent / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 rounded-lg bg-amber-900/30">
          <DollarSign className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">February Budget</h4>
          <p className="text-[10px] text-gray-500">18 days remaining</p>
        </div>
      </div>

      {/* Stats grid (real BudgetVarianceCard pattern) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Budget', value: `$${total.toLocaleString()}`, color: 'text-white' },
          { label: 'Spent', value: `$${spent.toLocaleString()}`, color: 'text-amber-400' },
          { label: 'Left', value: `$${remaining.toLocaleString()}`, color: 'text-green-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
            className="p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-center"
          >
            <p className="text-[10px] text-gray-500 mb-0.5">{stat.label}</p>
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">{percent}% used</span>
          <span className="text-xs text-gray-500">$75/day remaining</span>
        </div>
        <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-900/20"
      >
        <TrendingDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs text-amber-300">On track this month</span>
      </motion.div>
    </div>
  );
}

/* ── Step 2: Track expenses (real expense card patterns) ──────────── */
function TrackExpensesStep() {
  const expenses = [
    { name: 'Groceries', amount: '-$85.00', icon: ShoppingCart, time: 'Today, 2:15 PM', cat: 'Groceries' },
    { name: 'Gas Station', amount: '-$42.50', icon: Zap, time: 'Yesterday' },
    { name: 'Netflix', amount: '-$15.99', icon: Film, time: 'Feb 1' },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 rounded-lg bg-amber-900/30">
          <Receipt className="w-4 h-4 text-amber-400" />
        </div>
        <h4 className="text-sm font-semibold text-white">Recent Expenses</h4>
      </div>

      {expenses.map((expense, i) => (
        <motion.div
          key={expense.name}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.15, duration: 0.3 }}
          className={`flex items-center gap-3 p-2.5 rounded-lg border ${
            i === 0
              ? 'bg-amber-900/10 border-amber-500/30'
              : 'bg-gray-800/60 border-gray-700/50'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            i === 0 ? 'bg-amber-900/30' : 'bg-gray-700/60'
          }`}>
            <expense.icon className={`w-4 h-4 ${i === 0 ? 'text-amber-400' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200">{expense.name}</p>
            <p className="text-[10px] text-gray-500">{expense.time}</p>
          </div>
          <span className={`text-sm font-bold ${i === 0 ? 'text-amber-400' : 'text-gray-400'}`}>
            {expense.amount}
          </span>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="flex justify-between items-center pt-2 border-t border-gray-800"
      >
        <span className="text-xs text-gray-500">Total spent today</span>
        <span className="text-sm font-bold text-white">$85.00</span>
      </motion.div>
    </div>
  );
}

/* ── Step 3: Category breakdown (real progress bars) ──────────────── */
function CategoryBreakdownStep() {
  const categories = [
    { name: 'Groceries', percent: 65, spent: '$390', budget: '$600', icon: ShoppingCart, status: 'ok' },
    { name: 'Utilities', percent: 45, spent: '$135', budget: '$300', icon: Zap, status: 'ok' },
    { name: 'Dining', percent: 92, spent: '$368', budget: '$400', icon: UtensilsCrossed, status: 'warning' },
    { name: 'Entertainment', percent: 30, spent: '$60', budget: '$200', icon: Film, status: 'ok' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-2 rounded-lg bg-amber-900/30">
          <DollarSign className="w-4 h-4 text-amber-400" />
        </div>
        <h4 className="text-sm font-semibold text-white">By Category</h4>
      </div>

      {categories.map((cat, i) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.3 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <cat.icon className={`w-3.5 h-3.5 ${cat.status === 'warning' ? 'text-red-400' : 'text-gray-400'}`} />
              <span className="text-xs font-medium text-gray-200">{cat.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${cat.status === 'warning' ? 'text-red-400' : 'text-gray-400'}`}>
                {cat.spent}
              </span>
              <span className="text-[10px] text-gray-600">/ {cat.budget}</span>
            </div>
          </div>
          <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                cat.status === 'warning'
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
            />
          </div>
        </motion.div>
      ))}

      {/* Over-budget warning (real BudgetVarianceCard alert pattern) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="flex items-center gap-2 p-2.5 rounded-lg bg-red-900/10 border border-red-800"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        <span className="text-xs text-red-200">Dining is 92% of budget</span>
      </motion.div>
    </div>
  );
}

/* ── Step 4: Budget alerts (real variance card styling) ───────────── */
function BudgetAlertsStep() {
  return (
    <div className="space-y-3">
      {/* Over budget alert (real BudgetVarianceCard pattern) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="border rounded-xl p-4 bg-red-900/10 border-red-800"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-red-900/30">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-100">Dining Out</h4>
            <p className="text-[10px] text-red-300/70">$368 of $400 budget</p>
          </div>
        </div>
        <div className="h-2 bg-red-900/30 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '92%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
          />
        </div>
        <div className="p-2 rounded-lg bg-red-900/20">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-[10px] text-red-200">Try meal prepping to reduce dining costs</span>
          </div>
        </div>
      </motion.div>

      {/* Approaching budget (orange variant) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="border rounded-xl p-3 bg-orange-900/10 border-orange-800"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-900/30">
            <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-orange-100">Groceries</p>
            <p className="text-[10px] text-orange-300/70">$390 of $600 — 65%</p>
          </div>
        </div>
      </motion.div>

      {/* Under budget (good) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="border rounded-xl p-3 bg-green-900/10 border-green-800/50"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-green-900/30">
            <Film className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-green-100">Entertainment</p>
            <p className="text-[10px] text-green-300/70">$60 of $200 — on track</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Monthly overview', content: <MonthlyOverviewStep /> },
  { label: 'Track expenses', content: <TrackExpensesStep /> },
  { label: 'Category breakdown', content: <CategoryBreakdownStep /> },
  { label: 'Budget alerts', content: <BudgetAlertsStep /> },
];

export function BudgetDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Budget"
      colorScheme={{
        primary: 'amber-500',
        secondary: 'yellow-500',
        gradient: 'from-amber-500 to-yellow-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
