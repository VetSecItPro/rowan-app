'use client';

/**
 * Pricing Toggle Component
 * Monthly/Annual billing period switcher
 */

interface PricingToggleProps {
  value: 'monthly' | 'annual';
  onChange: (period: 'monthly' | 'annual') => void;
}

export function PricingToggle({ value, onChange }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Segmented Control Style Toggle */}
      <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={`rounded-md px-7 py-2.5 text-base font-semibold transition-all ${
            value === 'monthly'
              ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange('annual')}
          className={`rounded-md px-7 py-2.5 text-base font-semibold transition-all ${
            value === 'annual'
              ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Annual
        </button>
      </div>

      {/* Save Badge - Fixed width to prevent layout shift */}
      <div className="w-24">
        {value === 'annual' && (
          <div className="rounded-full bg-green-100 dark:bg-green-900 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300 text-center whitespace-nowrap">
            Save 17%
          </div>
        )}
      </div>
    </div>
  );
}
