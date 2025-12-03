'use client';

/**
 * Pricing Card Component
 * Displays a single pricing tier with features and CTA
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

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
  onSelect,
}: PricingCardProps) {
  const price = period === 'monthly' ? monthlyPrice : annualPrice;
  const isFree = tier === 'free';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col rounded-2xl border-2 p-8 shadow-lg transition-shadow hover:shadow-xl ${
        popular
          ? 'border-blue-500 dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700'
      } ${isFree ? 'bg-white dark:bg-gray-800' : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900'}`}
    >
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-600 dark:bg-blue-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isFree ? (
          <div className="flex items-baseline">
            <span className="text-5xl font-bold text-gray-900 dark:text-white">Free</span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-5xl font-bold text-gray-900 dark:text-white">${price}</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              /{period === 'monthly' ? 'mo' : 'year'}
            </span>
          </div>
        )}
        {!isFree && period === 'annual' && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ${(annualPrice / 12).toFixed(2)}/mo billed annually
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        className={`mb-6 w-full rounded-lg px-6 py-3 text-base font-semibold transition-all ${
          popular
            ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-md hover:shadow-lg'
            : isFree
              ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600'
        }`}
        aria-label={`${cta} for ${title} plan`}
      >
        {cta}
      </button>

      {/* Features List */}
      <div className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
