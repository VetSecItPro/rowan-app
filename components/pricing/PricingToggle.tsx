'use client';

/**
 * Pricing Toggle Component
 * Monthly/Annual billing period switcher with pill-shaped buttons
 */

interface PricingToggleProps {
  value: 'monthly' | 'annual';
  onChange: (period: 'monthly' | 'annual') => void;
}

/** Renders a monthly/yearly billing toggle for pricing display. */
export function PricingToggle({ value, onChange }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center">
      {/* Pill-shaped Toggle Container */}
      <div className="inline-flex rounded-full bg-gray-700/80 p-1.5">
        {/* Monthly Button */}
        <button
          type="button"
          data-testid="pricing-monthly-button"
          onClick={() => onChange('monthly')}
          className={`rounded-full px-8 py-2.5 text-base font-semibold transition-all ${
            value === 'monthly'
              ? 'bg-gray-800 text-emerald-400 shadow-md'
              : 'text-gray-300 hover:text-gray-100'
          }`}
        >
          Monthly
        </button>

        {/* Annual Button with Badge */}
        <div className="relative">
          {/* "2 months free" badge - positioned on top */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              2 months free
            </span>
          </div>

          <button
            type="button"
            data-testid="pricing-annual-button"
            onClick={() => onChange('annual')}
            className={`rounded-full px-8 py-2.5 text-base font-semibold transition-all ${
              value === 'annual'
                ? 'bg-gray-800 text-emerald-400 shadow-md'
                : 'text-gray-300 hover:text-gray-100'
            }`}
          >
            Annual
          </button>
        </div>
      </div>
    </div>
  );
}
