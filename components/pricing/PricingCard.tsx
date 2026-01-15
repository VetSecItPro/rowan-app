'use client';

/**
 * Pricing Card Component
 * Displays a single pricing tier with features and CTA
 */

import { Check, Loader2 } from 'lucide-react';

export interface PricingCardProps {
  tier: 'free' | 'pro' | 'family';
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  period: 'monthly' | 'annual';
  features: string[];
  cta: string;
  popular?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function PricingCard({
  tier,
  title,
  description,
  monthlyPrice,
  annualPrice,
  period,
  features,
  cta,
  popular = false,
  loading = false,
  disabled = false,
  onSelect,
}: PricingCardProps) {
  const price = period === 'monthly' ? monthlyPrice : annualPrice;
  const isFree = tier === 'free';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 ${
        popular
          ? 'border-emerald-400 hover:shadow-emerald-500/50 hover:shadow-2xl'
          : tier === 'family'
            ? 'border-gray-700 hover:shadow-indigo-500/30 hover:shadow-2xl'
            : 'border-gray-700 hover:shadow-gray-400/40 hover:shadow-2xl'
      } ${isFree ? 'bg-gray-800' : 'bg-gradient-to-br from-white from-gray-800 to-gray-900'}`}
    >
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-gradient-to-r from-emerald-600 from-emerald-500 to-teal-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-400">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-6 min-h-[120px]">
        {isFree ? (
          <div className="flex items-baseline">
            <span className="text-5xl font-bold text-white">Free</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline">
              <span className="text-5xl font-bold text-white">${price}</span>
              <span className="ml-2 text-gray-400">
                /{period === 'monthly' ? 'mo' : 'year'}
              </span>
            </div>
            <div className="mt-1 h-5">
              {period === 'annual' && (
                <p className="text-sm text-gray-400">
                  ${(annualPrice / 12).toFixed(2)}/mo billed annually
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={loading || disabled}
        className={`mb-6 w-full rounded-lg px-6 py-3 text-base font-semibold transition-all flex items-center justify-center gap-2 ${
          popular
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 from-emerald-500 hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg'
            : isFree
              ? 'bg-gray-200 text-gray-900 bg-gray-700 hover:bg-gray-600'
              : 'bg-gray-900 text-white bg-gray-700 hover:bg-gray-600'
        } ${(loading || disabled) ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-label={`${cta} for ${title} plan`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Processing...' : cta}
      </button>

      {/* Features List */}
      <div className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span className="text-sm text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
