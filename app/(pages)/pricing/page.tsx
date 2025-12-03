'use client';

/**
 * Pricing Page
 * Displays subscription tiers and pricing options
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import Image from 'next/image';

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
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              The family command center that works
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              Choose the plan that fits your family. Start free and upgrade anytime to unlock
              unlimited features and bring everyone together.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="mt-12">
            <PricingToggle value={period} onChange={handlePeriodChange} />
          </div>

          {/* Pricing Cards */}
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {/* Free Tier */}
            <PricingCard
              tier="free"
              title="Free"
              description="Perfect for trying out Rowan"
              monthlyPrice={0}
              annualPrice={0}
              period={period}
              features={[
                '50 active tasks',
                '5 tasks per day',
                '3 shopping lists',
                '20 messages per day',
                '2 users',
                '1 space',
                'Basic reminders',
                '30-day message history',
              ]}
              cta="Get Started"
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
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cancel anytime • 30-day money-back guarantee • Secure payment via Stripe
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
