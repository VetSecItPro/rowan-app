'use client';

/**
 * Payment Success Page
 * Shown after successful Polar checkout
 * Polls subscription status before confirming activation
 */

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useValidatedSearchParams, PaymentSuccessParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 text-emerald-500 animate-spin" /></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const { params } = useValidatedSearchParams(PaymentSuccessParamsSchema);
  const tier = params?.tier || 'pro';
  const period = params?.period || 'monthly';
  const [countdown, setCountdown] = useState(8);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const tierName = tier === 'family' ? 'Family' : 'Pro';
  const periodLabel = period === 'annual' ? 'annual' : 'monthly';

  // Poll subscription status until active
  const checkSubscription = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('subscriptions')
        .select('status, tier')
        .eq('user_id', user.id)
        .single();

      return data?.status === 'active' && data?.tier !== 'free';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (subscriptionActive) return;

    const pollInterval = setInterval(async () => {
      const isActive = await checkSubscription();
      if (isActive) {
        setSubscriptionActive(true);
        clearInterval(pollInterval);
      } else {
        setPollCount(prev => {
          // Stop polling after 15 attempts (30 seconds)
          if (prev >= 15) {
            clearInterval(pollInterval);
            // Show success anyway — webhook may still be processing
            setSubscriptionActive(true);
          }
          return prev + 1;
        });
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [subscriptionActive, checkSubscription]);

  // Auto-redirect countdown (starts after subscription confirmed)
  useEffect(() => {
    if (!subscriptionActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, subscriptionActive]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg"
        >
          {subscriptionActive ? (
            <CheckCircle className="h-10 w-10 text-white" />
          ) : (
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          data-testid="payment-success-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-2"
        >
          {subscriptionActive
            ? `Welcome to Rowan ${tierName}!`
            : 'Activating Your Subscription...'}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          data-testid="payment-success-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 mb-8"
        >
          {subscriptionActive
            ? `Your ${periodLabel} subscription is now active. You have full access to all ${tierName} features.`
            : 'Payment received. Setting up your account...'}
        </motion.p>

        {/* Features unlocked */}
        {subscriptionActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8 text-left"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold text-white">What&apos;s unlocked:</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Unlimited tasks & calendar events</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Meal planning & recipes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Goals & milestones tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Real-time collaboration</span>
              </li>
              {tier === 'family' && (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Up to 6 family members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>AI features & integrations</span>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Link
            data-testid="payment-success-dashboard-link"
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {subscriptionActive
              ? `Redirecting in ${countdown} seconds...`
              : `Confirming subscription${pollCount > 3 ? ' (this may take a moment)' : ''}...`}
          </p>
        </motion.div>

        {/* Receipt note */}
        {subscriptionActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-xs text-gray-400"
          >
            A receipt has been sent to your email address.
          </motion.p>
        )}
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
