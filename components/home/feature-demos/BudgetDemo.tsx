'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingDown,
  ShoppingCart,
  Zap,
  Film,
  UtensilsCrossed,
  Receipt,
  CalendarClock,
  Wifi,
} from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

// --- Step 1: Monthly Overview ---
function MonthlyOverview() {
  const spent = 1850;
  const total = 3200;
  const remaining = total - spent;
  const percent = Math.round((spent / total) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">February Budget</h4>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Total</p>
          <p className="text-sm font-bold text-white">$3,200</p>
        </div>
        <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Spent</p>
          <p className="text-sm font-bold text-amber-400">$1,850</p>
        </div>
        <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Remaining</p>
          <p className="text-sm font-bold text-emerald-400">${remaining.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">{percent}% used</span>
          <span className="text-xs text-gray-500">18 days left</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <TrendingDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs text-amber-300">On track - $75/day remaining</span>
      </div>
    </div>
  );
}

// --- Step 2: Track Expenses ---
function TrackExpenses() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Add Expense</h4>
      </div>

      {/* New expense being added */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Groceries</span>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base font-bold text-amber-400"
          >
            -$85.00
          </motion.span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Groceries
          </span>
          <span className="text-[10px] text-gray-500">Today, 2:15 PM</span>
        </div>
      </motion.div>

      {/* Recent expenses */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recent</p>
        {[
          { name: 'Gas Station', amount: '$42.50', icon: Zap, time: 'Yesterday' },
          { name: 'Netflix', amount: '$15.99', icon: Film, time: 'Feb 1' },
        ].map((expense, index) => (
          <motion.div
            key={expense.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.15 }}
            className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-700/60 flex items-center justify-center">
                <expense.icon className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-200">{expense.name}</p>
                <p className="text-[10px] text-gray-500">{expense.time}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400">{expense.amount}</span>
          </motion.div>
        ))}
      </div>

      {/* Updated total */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex justify-between items-center pt-2 border-t border-gray-800"
      >
        <span className="text-xs text-gray-500">Updated total spent</span>
        <span className="text-sm font-bold text-white">$1,935.00</span>
      </motion.div>
    </div>
  );
}

// --- Step 3: Category Breakdown ---
function CategoryBreakdown() {
  const categories = [
    { name: 'Groceries', percent: 65, spent: '$390', budget: '$600', icon: ShoppingCart, overBudget: false },
    { name: 'Utilities', percent: 45, spent: '$135', budget: '$300', icon: Zap, overBudget: false },
    { name: 'Entertainment', percent: 30, spent: '$60', budget: '$200', icon: Film, overBudget: false },
    { name: 'Dining Out', percent: 80, spent: '$320', budget: '$400', icon: UtensilsCrossed, overBudget: true },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Category Breakdown</h4>
      </div>

      {categories.map((cat, index) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.15, duration: 0.3 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <cat.icon className={`w-3.5 h-3.5 ${cat.overBudget ? 'text-red-400' : 'text-gray-400'}`} />
              <span className="text-xs font-medium text-gray-200">{cat.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${cat.overBudget ? 'text-red-400' : 'text-gray-400'}`}>
                {cat.spent}
              </span>
              <span className="text-[10px] text-gray-600">/ {cat.budget}</span>
            </div>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                cat.overBudget
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
            />
          </div>
          {cat.overBudget && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + index * 0.15 }}
              className="text-[10px] text-red-400"
            >
              80% used - watch spending
            </motion.p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// --- Step 4: Bill Reminders ---
function BillReminders() {
  const bills = [
    { name: 'Electric Bill', amount: '$120.00', due: 'Feb 15', daysLeft: 11, icon: Zap },
    { name: 'Internet', amount: '$65.00', due: 'Feb 20', daysLeft: 16, icon: Wifi },
    { name: 'Streaming Services', amount: '$45.99', due: 'Feb 28', daysLeft: 24, icon: Film },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Upcoming Bills</h4>
      </div>

      {bills.map((bill, index) => (
        <motion.div
          key={bill.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2, duration: 0.4 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <bill.icon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200">{bill.name}</p>
            <p className="text-[10px] text-gray-500">Due {bill.due}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-white">{bill.amount}</p>
            <p className={`text-[10px] ${bill.daysLeft <= 14 ? 'text-amber-400' : 'text-gray-500'}`}>
              {bill.daysLeft}d left
            </p>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-between items-center p-2.5 rounded-xl bg-gray-800/40 border border-gray-700/30"
      >
        <span className="text-xs text-gray-500">Total upcoming</span>
        <span className="text-sm font-bold text-amber-400">$230.99</span>
      </motion.div>
    </div>
  );
}

// --- Steps Configuration ---
const steps: DemoStep[] = [
  { label: 'Monthly overview', content: <MonthlyOverview />, duration: 3000 },
  { label: 'Track expenses', content: <TrackExpenses />, duration: 3000 },
  { label: 'Category breakdown', content: <CategoryBreakdown />, duration: 3000 },
  { label: 'Bill reminders', content: <BillReminders />, duration: 3000 },
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
