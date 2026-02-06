'use client';

import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Check, DollarSign } from 'lucide-react';

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
        <div>
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-500">0 items</p>
        </div>
      </motion.div>

      {/* Empty add-item input */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 border-dashed"
      >
        <Plus className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-gray-600">Add an item...</span>
      </motion.div>

      {/* Empty state hint */}
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

function AddItemsStep() {
  const items = [
    { name: 'Milk', qty: '1 gal' },
    { name: 'Eggs', qty: '1 dozen' },
    { name: 'Bread', qty: '2 loaves' },
    { name: 'Chicken', qty: '2 lbs' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-500">4 items</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.15, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50"
          >
            <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0" />
            <span className="flex-1 text-sm text-gray-200">{item.name}</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-[11px] text-emerald-400 font-medium">
              {item.qty}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ShopTogetherStep() {
  const items = [
    { name: 'Milk', assignee: 'D', assigneeColor: 'bg-blue-500', checked: true },
    { name: 'Eggs', assignee: 'M', assigneeColor: 'bg-pink-500', checked: false },
    { name: 'Bread', assignee: 'D', assigneeColor: 'bg-blue-500', checked: true },
    { name: 'Chicken', assignee: 'M', assigneeColor: 'bg-pink-500', checked: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-gray-500">2 of 4 done</p>
        </div>
        {/* Shared avatars */}
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900">
            D
          </div>
          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900">
            M
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + index * 0.1, duration: 0.3 }}
            className={`flex items-center gap-3 p-2.5 rounded-xl border ${
              item.checked
                ? 'bg-gray-800/30 border-gray-700/30'
                : 'bg-gray-800/60 border-gray-700/50'
            }`}
          >
            <div
              className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                item.checked ? 'bg-emerald-500' : 'border-2 border-gray-600'
              }`}
            >
              {item.checked && <Check className="w-3 h-3 text-white" />}
            </div>
            <span
              className={`flex-1 text-sm ${
                item.checked ? 'text-gray-500 line-through' : 'text-gray-200'
              }`}
            >
              {item.name}
            </span>
            <div
              className={`w-6 h-6 rounded-full ${item.assigneeColor} flex items-center justify-center text-[10px] font-bold text-white`}
            >
              {item.assignee}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TrackSpendingStep() {
  const items = [
    { name: 'Milk', price: '$4.99', checked: true },
    { name: 'Eggs', price: '$6.49', checked: true },
    { name: 'Bread', price: '$7.98', checked: true },
    { name: 'Chicken', price: '$28.04', checked: true },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Weekly Groceries</h4>
          <p className="text-xs text-emerald-400">All done</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/30 border border-gray-700/30"
          >
            <div className="w-5 h-5 rounded bg-emerald-500 flex-shrink-0 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="flex-1 text-sm text-gray-500 line-through">{item.name}</span>
            <span className="text-sm text-gray-400 font-medium">{item.price}</span>
          </motion.div>
        ))}
      </div>

      {/* Total */}
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
          $47.50
        </motion.span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Create a list', content: <CreateListStep /> },
  { label: 'Add items quickly', content: <AddItemsStep /> },
  { label: 'Shop together', content: <ShopTogetherStep /> },
  { label: 'Track spending', content: <TrackSpendingStep /> },
];

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
