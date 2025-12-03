'use client';

/**
 * Pricing Toggle Component
 * Monthly/Annual billing period switcher
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PricingToggleProps {
  onChange: (period: 'monthly' | 'annual') => void;
  defaultPeriod?: 'monthly' | 'annual';
}

export function PricingToggle({ onChange, defaultPeriod = 'monthly' }: PricingToggleProps) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>(defaultPeriod);

  const handleToggle = (newPeriod: 'monthly' | 'annual') => {
    if (newPeriod !== period) {
      setPeriod(newPeriod);
      onChange(newPeriod);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => handleToggle('monthly')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          period === 'monthly'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        Monthly
      </button>

      <button
        onClick={() => handleToggle(period === 'monthly' ? 'annual' : 'monthly')}
        className="relative"
        aria-label={`Switch to ${period === 'monthly' ? 'annual' : 'monthly'} billing`}
      >
        {/* Toggle Switch */}
        <div className="flex h-8 w-16 items-center rounded-full bg-gray-200 dark:bg-gray-700 p-1">
          <motion.div
            className="h-6 w-6 rounded-full bg-emerald-600 dark:bg-emerald-500 shadow-md"
            animate={{
              x: period === 'monthly' ? 0 : 32,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
          />
        </div>
      </button>

      <button
        onClick={() => handleToggle('annual')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          period === 'annual'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        Annual
      </button>

      {/* Save Badge */}
      {period === 'annual' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full bg-green-100 dark:bg-green-900 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300"
        >
          Save 17%
        </motion.div>
      )}
    </div>
  );
}
