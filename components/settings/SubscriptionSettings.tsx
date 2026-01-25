'use client';

/**
 * Subscription Settings Tab
 * Displays subscription status, trial info, and upgrade options
 * Updated to use correct type properties from subscription-context
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Crown,
  Clock,
  Check,
  Sparkles,
  Zap,
  Shield,
  AlertTriangle,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  ShoppingCart,
  Camera,
  Star,
  Loader2,
  CreditCard,
  Receipt,
  CalendarClock,
  ExternalLink
} from 'lucide-react';
import { useSubscriptionSafe } from '@/lib/contexts/subscription-context';
import type { FeatureLimits } from '@/lib/types';
import { motion } from 'framer-motion';

interface BillingInfo {
  hasBillingInfo: boolean;
  nextBillingDate?: string;
  nextAmount?: number;
  currency?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  status?: string;
  cancelAtPeriodEnd?: boolean;
}

const TIER_DETAILS = {
  free: {
    name: 'Free',
    color: 'gray',
    gradient: 'from-gray-500 to-gray-600',
    features: [
      'Up to 50 active tasks',
      '5 tasks/day creation limit',
      'Basic reminders',
      '20 messages/day',
      '3 shopping lists',
      '1 space',
      '2 household members',
    ],
  },
  pro: {
    name: 'Pro',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    features: [
      'Unlimited tasks & calendar',
      'Photo upload (2GB)',
      'Meal planning & recipes',
      'Goals & milestones',
      'Household management',
      'Instant real-time sync',
      '2 spaces',
      '2 household members',
    ],
  },
  family: {
    name: 'Family',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500',
    features: [
      'Everything in Pro',
      'AI-powered features',
      'External integrations',
      '3 spaces',
      '6 household members',
      '5GB storage',
      'Priority support',
    ],
  },
};

export function SubscriptionSettings() {
  const subscription = useSubscriptionSafe();

  // Safe defaults when outside provider context
  const tier = subscription?.tier ?? 'free';
  const effectiveTier = subscription?.effectiveTier ?? 'free';
  const isLoading = subscription?.isLoading ?? true;
  const isInTrial = subscription?.isInTrial ?? false;
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;
  const hasTrialExpired = subscription?.hasTrialExpired ?? false;
  const trial = subscription?.trial ?? null;
  const limits: FeatureLimits = subscription?.limits ?? {
    maxActiveTasks: Infinity,
    dailyTaskCreation: Infinity,
    canCreateCalendar: true,
    maxShoppingLists: Infinity,
    maxShoppingItems: Infinity,
    dailyShoppingUpdates: Infinity,
    messageHistoryDays: Infinity,
    dailyMessages: Infinity,
    dailyQuickActions: Infinity,
    canUploadPhotos: true,
    canUseMealPlanning: true,
    canUseReminders: true,
    canUseGoals: true,
    canUseHousehold: true,
    canUseLocation: true,
    canUseAI: true,
    canUseIntegrations: true,
    canUseEventProposals: true,
    realtimeSyncDelay: 0,
    maxUsers: Infinity,
    maxSpaces: Infinity,
    storageGB: Infinity,
  };

  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isBillingInfoLoading, setIsBillingInfoLoading] = useState(false);

  // Fetch billing info for paid users
  useEffect(() => {
    if (tier === 'pro' || tier === 'family') {
      setIsBillingInfoLoading(true);
      fetch('/api/stripe/billing-info')
        .then(res => res.json())
        .then(data => {
          setBillingInfo(data);
        })
        .catch(err => {
          logger.error('Failed to fetch billing info:', err, { component: 'SubscriptionSettings', action: 'component_action' });
        })
        .finally(() => {
          setIsBillingInfoLoading(false);
        });
    }
  }, [tier]);

  /**
   * Opens Stripe Customer Portal for billing management
   */
  const handleManageBilling = async () => {
    setIsBillingLoading(true);
    setBillingError(null);

    try {
      const response = await csrfFetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open billing portal');
      }

      const { url } = await response.json();

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      logger.error('Error opening billing portal:', error, { component: 'SubscriptionSettings', action: 'component_action' });
      setBillingError(error instanceof Error ? error.message : 'Failed to open billing portal');
      setIsBillingLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-700 rounded mb-4" />
          <div className="h-32 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const currentTierDetails = TIER_DETAILS[effectiveTier];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Subscription</h2>
        <p className="text-sm sm:text-base text-gray-400">Manage your plan and view your current features</p>
      </div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border p-6 shadow-lg ${
          effectiveTier === 'family'
            ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-800'
            : effectiveTier === 'pro'
              ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-800'
              : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
        }`}
      >
        {/* Decorative gradient overlay */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 bg-gradient-to-br ${currentTierDetails.gradient}`} />

        <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${currentTierDetails.gradient} flex items-center justify-center shadow-lg`}>
              <Crown className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">
                  {currentTierDetails.name} Plan
                </h3>
                {isInTrial && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-800">
                    <Clock className="h-3 w-3" />
                    Trial
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {isInTrial
                  ? `You're enjoying Pro features during your free trial`
                  : tier === 'free'
                    ? 'Upgrade to unlock more features and remove limits'
                    : 'Thank you for being a valued subscriber!'
                }
              </p>
            </div>
          </div>

          {tier !== 'family' && (
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              {tier === 'pro' ? 'Upgrade to Family' : 'Upgrade'}
            </Link>
          )}
        </div>

        {/* Trial Status */}
        {isInTrial && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <span className="font-semibold text-amber-200">
                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining in your trial
              </span>
            </div>
            <p className="text-sm text-amber-300 mb-3">
              {trial?.trialEndsAt
                ? `Your trial ends on ${new Date(trial.trialEndsAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
                : 'Your trial is active.'
              }
              {' '}Upgrade before it ends to keep all Pro features.
            </p>
            <div className="h-2.5 rounded-full bg-amber-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, (trialDaysRemaining / 14) * 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-xs text-amber-400">
              {Math.round((trialDaysRemaining / 14) * 100)}% of trial remaining
            </p>
          </div>
        )}

        {hasTrialExpired && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-900/20 to-rose-900/20 border border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="font-semibold text-red-200">
                Your trial has ended
              </span>
            </div>
            <p className="text-sm text-red-300">
              You&apos;ve been moved to the Free plan with limited features. Upgrade now to regain access to all Pro features.
            </p>
          </div>
        )}

        {/* Current Plan Features */}
        <div className="border-t border-gray-700 pt-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Your current features
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentTierDetails.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  effectiveTier === 'family'
                    ? 'bg-purple-900/30'
                    : effectiveTier === 'pro'
                      ? 'bg-emerald-900/30'
                      : 'bg-gray-800'
                }`}>
                  <Check className={`h-3 w-3 ${
                    effectiveTier === 'family' ? 'text-purple-400' :
                    effectiveTier === 'pro' ? 'text-emerald-400' : 'text-gray-500'
                  }`} />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Billing Summary Card - Only for paid subscribers */}
      {(tier === 'pro' || tier === 'family') && billingInfo?.hasBillingInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              Billing Summary
            </h3>
            <button
              onClick={handleManageBilling}
              disabled={isBillingLoading}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              {isBillingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Manage in Stripe
                  <ExternalLink className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {isBillingInfoLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-4 rounded-xl bg-gray-700/50">
                  <div className="h-4 w-20 bg-gray-600 rounded mb-2" />
                  <div className="h-6 w-32 bg-gray-600 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Next Billing Date */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">Next Billing</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {billingInfo.nextBillingDate
                      ? new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '—'
                    }
                  </p>
                  {billingInfo.cancelAtPeriodEnd && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Cancels after this period
                    </p>
                  )}
                </div>

                {/* Amount Due */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Amount</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {billingInfo.nextAmount !== undefined && billingInfo.nextAmount !== null
                      ? `$${billingInfo.nextAmount.toFixed(2)}`
                      : '—'
                    }
                    {billingInfo.currency && (
                      <span className="text-xs text-gray-400 ml-1">{billingInfo.currency}</span>
                    )}
                  </p>
                </div>

                {/* Payment Method */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">Payment Method</span>
                  </div>
                  {billingInfo.paymentMethod ? (
                    <>
                      <p className="text-lg font-bold text-white capitalize">
                        {billingInfo.paymentMethod.brand} •••• {billingInfo.paymentMethod.last4}
                      </p>
                      <p className="text-xs text-gray-400">
                        Expires {billingInfo.paymentMethod.expMonth}/{billingInfo.paymentMethod.expYear}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-white">—</p>
                  )}
                </div>
              </div>

              {/* Quick note */}
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <Shield className="h-3 w-3 text-green-500" />
                View full billing history and invoices in Stripe
              </p>
            </>
          )}
        </motion.div>
      )}

      {/* Usage Limits */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Feature Limits
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800">
            <CheckSquare className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {limits.maxActiveTasks === Infinity ? '∞' : limits.maxActiveTasks}
            </p>
            <p className="text-xs text-gray-400 mt-1">Active Tasks</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800">
            <Calendar className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {limits.canCreateCalendar ? '∞' : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Calendar Events</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-800">
            <Users className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {limits.maxSpaces}
            </p>
            <p className="text-xs text-gray-400 mt-1">Spaces</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800">
            <Users className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {limits.maxUsers}
            </p>
            <p className="text-xs text-gray-400 mt-1">Users</p>
          </div>
        </div>

        {/* Additional limits row */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-gray-700/50 border border-gray-600">
            <MessageSquare className="h-5 w-5 text-green-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">
              {limits.dailyMessages === Infinity ? '∞' : limits.dailyMessages}
            </p>
            <p className="text-xs text-gray-400 mt-1">Messages/Day</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gray-700/50 border border-gray-600">
            <ShoppingCart className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">
              {limits.maxShoppingLists === Infinity ? '∞' : limits.maxShoppingLists}
            </p>
            <p className="text-xs text-gray-400 mt-1">Shopping Lists</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gray-700/50 border border-gray-600">
            <Camera className="h-5 w-5 text-pink-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">
              {limits.canUploadPhotos ? (limits.storageGB ? `${limits.storageGB}GB` : '∞') : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Photo Storage</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gray-700/50 border border-gray-600">
            <Zap className="h-5 w-5 text-amber-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">
              {limits.dailyQuickActions === Infinity ? '∞' : limits.dailyQuickActions}
            </p>
            <p className="text-xs text-gray-400 mt-1">Quick Actions/Day</p>
          </div>
        </div>
      </motion.div>

      {/* Billing & Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Billing & Management
        </h3>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-between p-4 rounded-xl border border-gray-700 hover:bg-gray-700/50 hover:border-emerald-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                <Crown className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-semibold text-white block">View Plans & Pricing</span>
                <span className="text-xs text-gray-400">Compare all available plans</span>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">→</span>
          </Link>

          {(tier === 'pro' || tier === 'family') && (
            <div className="space-y-2">
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-700 hover:bg-gray-700/50 hover:border-blue-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleManageBilling}
                disabled={isBillingLoading}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                    {isBillingLoading ? (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    ) : (
                      <Shield className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-white block">
                      {isBillingLoading ? 'Opening Billing Portal...' : 'Manage Billing'}
                    </span>
                    <span className="text-xs text-gray-400">Update payment method, view invoices</span>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
              </button>
              {billingError && (
                <p className="text-sm text-red-400 flex items-center gap-2 px-4">
                  <AlertTriangle className="h-4 w-4" />
                  {billingError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 p-4 rounded-xl bg-gray-700/50">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            Secure payments processed by Stripe. Your payment information is never stored on our servers.
          </p>
        </div>
      </motion.div>

      {/* Need Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700"
      >
        <h4 className="text-sm font-semibold text-white mb-2">Need help with your subscription?</h4>
        <p className="text-xs text-gray-400 mb-4">
          Contact our support team for assistance with billing, plan changes, or any subscription questions.
        </p>
        <Link
          href="/settings/support"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Contact Support
          <span>→</span>
        </Link>
      </motion.div>
    </div>
  );
}
