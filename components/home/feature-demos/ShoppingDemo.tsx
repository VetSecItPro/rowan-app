'use client';

import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Check, DollarSign } from 'lucide-react';

/* Category groups matching real ShoppingListCard.tsx */
const CATEGORIES = [
  { emoji: '🥬', name: 'Produce', items: ['Avocados (3)', 'Bell peppers'] },
  { emoji: '🥛', name: 'Dairy', items: ['Milk (2%)', 'Greek yogurt'] },
  { emoji: '🍖', name: 'Meat', items: ['Chicken breast'] },
];

/* ── Step 1: Create list ─────────────────────────────────────────── */
function CreateListStep() {
  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center gap-2.5 mb-4"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-400">0 items</p>
        </div>
        {/* Status badge (real pattern) */}
        <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-blue-900/30 text-blue-300">Active</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 border-dashed"
      >
        <Plus className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-gray-600">Add an item...</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="text-center py-4"
      >
        <p className="text-xs text-gray-600">Start adding items to your list</p>
      </motion.div>
    </div>
  );
}

/* ── Step 2: Add items by category ───────────────────────────────── */
function AddItemsStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-400">5 items</p>
        </div>
      </div>

      {/* Category groups with emojis (real pattern) */}
      {CATEGORIES.map((cat, catIdx) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + catIdx * 0.15, duration: 0.3 }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">{cat.emoji}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{cat.name}</span>
          </div>
          <div className="space-y-1.5">
            {cat.items.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + catIdx * 0.15 + i * 0.08, duration: 0.25 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div className="w-4.5 h-4.5 rounded border-2 border-gray-600 hover:border-emerald-500 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-200">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Step 3: Shop together (real-time sync) ──────────────────────── */
function ShopTogetherStep() {
  const items = [
    { name: 'Milk (2%)', assignee: 'D', color: 'bg-blue-500', checked: true },
    { name: 'Avocados (3)', assignee: 'M', color: 'bg-pink-500', checked: false },
    { name: 'Chicken breast', assignee: 'D', color: 'bg-blue-500', checked: true },
    { name: 'Greek yogurt', assignee: 'M', color: 'bg-pink-500', checked: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-400">2 of 4 done</p>
        </div>
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900">D</div>
          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900">M</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
            className={`flex items-center gap-3 p-2 rounded-lg border ${
              item.checked ? 'bg-gray-800/30 border-gray-700/30' : 'bg-gray-800 border-gray-700'
            }`}
          >
            {/* Checkbox (real pattern: checked = green filled) */}
            <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
              item.checked ? 'bg-green-500 border-green-500' : 'border-2 border-gray-600'
            }`}>
              {item.checked && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={`flex-1 text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
              {item.name}
            </span>
            <div className={`w-6 h-6 rounded-full ${item.color} flex items-center justify-center text-[10px] font-bold text-white`}>
              {item.assignee}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 4: Track spending ──────────────────────────────────────── */
function TrackSpendingStep() {
  const items = [
    { name: 'Milk (2%)', price: '$4.99' },
    { name: 'Avocados (3)', price: '$6.49' },
    { name: 'Chicken breast', price: '$12.98' },
    { name: 'Greek yogurt', price: '$5.99' },
    { name: 'Bell peppers', price: '$3.49' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-green-900/30 text-green-300">Completed</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.25 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30 border border-gray-700/30"
          >
            <div className="w-5 h-5 rounded bg-green-500 flex-shrink-0 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="flex-1 text-sm text-gray-500 line-through">{item.name}</span>
            <span className="text-sm text-gray-400 font-medium">{item.price}</span>
          </motion.div>
        ))}
      </div>

      {/* Budget tracker (real pattern) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-gray-300">Total</span>
        </div>
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
          className="text-lg font-bold text-emerald-400"
        >
          $33.94
        </motion.span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Create a list', content: <CreateListStep /> },
  { label: 'Add items by category', content: <AddItemsStep /> },
  { label: 'Shop together', content: <ShopTogetherStep /> },
  { label: 'Track spending', content: <TrackSpendingStep /> },
];

/** Renders an animated shopping list feature demonstration for the landing page. */
export function ShoppingDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Shopping Lists"
      colorScheme={{
        primary: 'emerald-500',
        secondary: 'teal-500',
        gradient: 'from-emerald-500 to-teal-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
