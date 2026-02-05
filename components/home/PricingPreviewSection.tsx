'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PricingPreviewSectionProps {
  onSignupClick: () => void;
}

const tiers = [
  {
    name: 'Free Trial',
    price: '$0',
    period: 'for 14 days',
    description: '14 days of Pro features, no credit card',
    features: [
      'Full access to all Pro features',
      '2 household members',
      'No credit card required',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/mo',
    description: 'Everything you need for your household',
    features: [
      'Unlimited tasks, calendar & lists',
      '2 household members',
      'Meal planning & recipes',
    ],
    popular: true,
  },
  {
    name: 'Family',
    price: '$18',
    period: '/mo',
    description: 'For larger families who need more',
    features: [
      'Everything in Pro',
      '6 household members',
      'AI features & advanced analytics',
    ],
    popular: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

export function PricingPreviewSection({ onSignupClick }: PricingPreviewSectionProps) {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Start free for 14 days. Upgrade only when you love it.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {tiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                tier.popular
                  ? 'border-blue-500/40 bg-blue-950/20 shadow-lg shadow-blue-500/5'
                  : 'border-gray-700/50 bg-gray-800/30'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-400">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-400 ml-1">{tier.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={onSignupClick}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02]'
                    : 'bg-gray-700/50 hover:bg-gray-700 text-white hover:scale-[1.02]'
                }`}
                aria-label={`Start free trial for ${tier.name} plan`}
              >
                Start Free
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Link to full pricing page */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            See full pricing details
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
