'use client';

/**
 * Pricing Page
 * Displays subscription tiers and pricing options
 * Updated for 14-day trial model
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import Image from 'next/image';
import { Sparkles, Clock, Shield } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handlePeriodChange = (newPeriod: 'monthly' | 'annual') => {
    console.log('[PricingPage] Period changing from', period, 'to', newPeriod);
    setPeriod(newPeriod);
  };

  const handleSelectPlan = (tier: 'free' | 'pro' | 'family') => {
    if (tier === 'free') {
      router.push('/signup');
    } else {
      // TODO: Implement Stripe checkout
      console.log(`Selected ${tier} - ${period}`);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <Image
                src="/rowan-logo.png"
                alt="Rowan"
                width={64}
                height={64}
                className="rounded-2xl"
              />
            </div>

            {/* Trial Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 px-4 py-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Start with a 14-day free trial - no credit card required
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              The family command center that works
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              Try Rowan Pro free for 14 days. Experience unlimited tasks, calendar, meal planning,
              and more. No commitment - upgrade only if you love it.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="mt-12">
            <PricingToggle value={period} onChange={handlePeriodChange} />
          </div>

          {/* Pricing Cards */}
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {/* Free Trial Tier */}
            <PricingCard
              tier="free"
              title="Free Trial"
              description="14 days of Pro features, no credit card"
              monthlyPrice={0}
              annualPrice={0}
              period={period}
              features={[
                '14-day Pro trial included',
                'Unlimited tasks & calendar',
                'Unlimited messages',
                'Photo uploads (trial)',
                'Meal planning (trial)',
                'Goals & milestones (trial)',
                '2 users, 1 space',
                'Falls back to free tier after trial',
              ]}
              cta="Start 14-Day Trial"
              onSelect={() => handleSelectPlan('free')}
            />

            {/* Pro Tier */}
            <PricingCard
              tier="pro"
              title="Pro"
              description="Everything you need for household collaboration"
              monthlyPrice={11.99}
              annualPrice={119}
              period={period}
              features={[
                'Unlimited tasks & calendar',
                'Unlimited messages',
                'Unlimited shopping lists',
                'Photo upload (5GB storage)',
                'Meal planning & recipes',
                'Goals & milestones',
                'Household management',
                'Real-time collaboration',
                '2 users',
                '1 space',
              ]}
              cta="Upgrade to Pro"
              popular={true}
              onSelect={() => handleSelectPlan('pro')}
            />

            {/* Family Tier */}
            <PricingCard
              tier="family"
              title="Family"
              description="Complete family organization for up to 6 users"
              monthlyPrice={17.99}
              annualPrice={179}
              period={period}
              features={[
                'Everything in Pro, plus:',
                '6 users (vs 2 in Pro)',
                '3 spaces (vs 1 in Pro)',
                '15GB storage (vs 5GB)',
                'AI features',
                'External integrations',
                'Priority support',
                'Advanced analytics',
              ]}
              cta="Upgrade to Family"
              onSelect={() => handleSelectPlan('family')}
            />
          </div>

          {/* Trust Signals */}
          <div className="mt-16">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
              30-day money-back guarantee on paid plans • Secure payment via Stripe
            </p>
          </div>

          {/* FAQ Section */}
          <div className="mt-24">
            <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto mt-12 max-w-3xl space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Can I switch plans later?
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                  immediately, and we'll prorate any charges or credits.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What happens to my data if I cancel?
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Your data is safe! If you cancel, you'll still have access until the end of your
                  billing period. After that, you'll be downgraded to the free tier, and your data
                  remains accessible with free tier limits.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Do you offer refunds?
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  We offer a 30-day money-back guarantee. If you're not satisfied within the first
                  30 days, contact us for a full refund, no questions asked.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  How do I cancel my subscription?
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  You can cancel anytime from your account settings. Your subscription will remain
                  active until the end of the current billing period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What payment methods do you accept?
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  We accept all major credit cards (Visa, Mastercard, American Express, Discover)
                  through our secure payment processor, Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
