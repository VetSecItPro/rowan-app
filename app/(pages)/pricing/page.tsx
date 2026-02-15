'use client';

/**
 * Pricing Page
 * Displays subscription tiers and pricing options
 * Updated for 14-day trial model with Polar checkout integration
 * Includes Founding Member program for first 1000 subscribers
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { Sparkles, Clock, Shield } from 'lucide-react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

export default function PricingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foundingMemberSoldOut, setFoundingMemberSoldOut] = useState(false);

  // Fetch founding member spots remaining — badge shows by default, hidden only if sold out
  useEffect(() => {
    fetch('/api/founding-members')
      .then(res => res.json())
      .then(data => {
        if (data.spotsRemaining === 0) setFoundingMemberSoldOut(true);
      })
      .catch(() => { /* keep badge visible on error */ });
  }, []);

  const handlePeriodChange = (newPeriod: 'monthly' | 'annual') => {
    setPeriod(newPeriod);
  };

  const handleSelectPlan = async (tier: 'free' | 'pro' | 'family') => {
    setError(null);

    if (tier === 'free') {
      router.push('/signup');
      return;
    }

    setLoading(tier);

    try {
      // Create Polar checkout session
      const response = await csrfFetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: tier, billingInterval: period }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // User not logged in - redirect to signup
          router.push('/signup?redirect=/pricing');
          return;
        }
        throw new Error(data.message || data.error || 'Failed to create checkout session');
      }

      // Redirect to Polar Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      logger.error('Checkout error:', err, { component: 'page', action: 'execution' });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <PublicHeader />

      <main>
      {/* Hero Section */}
      <div className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            {/* Trial Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 px-4 py-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Start with a 14-day free trial - no credit card required
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              The family command center that works
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
              Try Rowan Pro free for 14 days. Experience unlimited tasks, calendar, meal planning,
              and more. No commitment - upgrade only if you love it.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="mt-12">
            <PricingToggle value={period} onChange={handlePeriodChange} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-8 mx-auto max-w-md rounded-lg bg-red-900/20 border border-red-800 p-4 text-center">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

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
                '1 space',
                '2 household members',
                'Falls back to free tier after trial',
              ]}
              cta="Start 14-Day Trial"
              loading={loading === 'free'}
              disabled={loading !== null}
              onSelect={() => handleSelectPlan('free')}
            />

            {/* Pro Tier */}
            <PricingCard
              tier="pro"
              title="Pro"
              description="Everything you need for household collaboration"
              monthlyPrice={18}
              annualPrice={180}
              period={period}
              features={[
                'Unlimited tasks & calendar',
                'Unlimited messages',
                'Unlimited shopping lists',
                'Photo upload (2GB storage)',
                'Meal planning & recipes',
                'Goals & milestones',
                'Household management',
                'Real-time collaboration',
                'AI Assistant (Limited)',
                '2 spaces',
                '2 household members',
              ]}
              cta="Sign Up to Pro"
              popular={true}
              loading={loading === 'pro'}
              disabled={loading !== null}
              showFoundingMember={!foundingMemberSoldOut}
              onSelect={() => handleSelectPlan('pro')}
            />

            {/* Family Tier */}
            <PricingCard
              tier="family"
              title="Family"
              description="Complete family organization for up to 6 members"
              monthlyPrice={29}
              annualPrice={290}
              period={period}
              features={[
                'Everything in Pro, plus:',
                '3 spaces (vs 2)',
                '6 household members (vs 2)',
                '5GB storage (vs 2GB)',
                'AI Assistant (Full + Voice)',
                'External integrations',
                'Advanced analytics',
              ]}
              cta="Sign Up to Family"
              loading={loading === 'family'}
              disabled={loading !== null}
              showFoundingMember={!foundingMemberSoldOut}
              onSelect={() => handleSelectPlan('family')}
            />
          </div>

          {/* Trust Signals */}
          <div className="mt-16">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Cancel anytime, keep access through billing period</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-gray-400">
              Secure payment via Polar
            </p>
          </div>

          {/* FAQ Section */}
          <div className="mt-24">
            <h2 className="text-center text-3xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto mt-12 max-w-3xl space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Can I switch plans later?
                </h3>
                <p className="mt-2 text-gray-400">
                  Yes! You can upgrade or downgrade your plan at any time from your account
                  settings. When you switch plans, your current plan remains active until the end
                  of the billing period, and the new plan takes effect at the start of the next period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  What happens to my data if I cancel?
                </h3>
                <p className="mt-2 text-gray-400">
                  Your data is safe! If you cancel, you&apos;ll still have access until the end of your
                  billing period. After that, you&apos;ll be downgraded to the free tier, and your data
                  remains accessible with free tier limits.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  What is your refund policy?
                </h3>
                <p className="mt-2 text-gray-400">
                  All sales are final. We offer a generous 14-day free trial so you can fully
                  evaluate Rowan before subscribing. If you cancel, your plan remains active
                  until the end of the current billing period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  How do I cancel my subscription?
                </h3>
                <p className="mt-2 text-gray-400">
                  You can cancel anytime from your account settings. Your subscription will remain
                  active until the end of the current billing period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  What payment methods do you accept?
                </h3>
                <p className="mt-2 text-gray-400">
                  We accept all major credit and debit cards through our secure payment
                  processor, Polar.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  What is the Founding Member program?
                </h3>
                <p className="mt-2 text-gray-400">
                  Our first 1,000 paying subscribers become Founding Members and lock in their
                  current price forever, even when we raise prices in the future. It&apos;s our way
                  of thanking early supporters who believe in Rowan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
}
