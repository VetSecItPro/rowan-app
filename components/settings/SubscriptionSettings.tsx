'use client';

/**
 * Subscription Settings Tab
 * Displays subscription status and upgrade options
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Crown,
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
  ExternalLink,
  ArrowDownCircle
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
    ],
  },
  owner: {
    name: 'Owner',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500',
    features: [
      'All Family features',
      'Full AI access',
      'Unlimited storage',
      'Unlimited spaces & members',
      'Admin dashboard access',
    ],
  },
};

/** Renders subscription plan management with upgrade/downgrade options. */
export function SubscriptionSettings() {
  const subscription = useSubscriptionSafe();

  // Safe defaults when outside provider context
  const tier = subscription?.tier ?? 'free';
  const effectiveTier = subscription?.effectiveTier ?? 'free';
  const isLoading = subscription?.isLoading ?? true;
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
      fetch('/api/polar/billing-info')
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
   * Opens Polar Customer Portal for billing management
   */
  const handleManageBilling = async () => {
    setIsBillingLoading(true);
    setBillingError(null);

    try {
      const response = await csrfFetch('/api/polar/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open billing portal');
      }

      const { url } = await response.json();

      // Redirect to Polar Customer Portal
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
                <h3 data-testid="subscription-plan-name" className="text-xl font-bold text-white">
                  {currentTierDetails.name} Plan
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                {tier === 'free'
                  ? 'Upgrade to unlock more features and remove limits'
                  : 'Thank you for being a valued subscriber!'
                }
              </p>
            </div>
          </div>

          {tier !== 'family' && tier !== 'owner' && (
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              {tier === 'pro' ? 'Upgrade to Family' : 'Upgrade'}
            </Link>
          )}
        </div>

        {/* Current Plan Features */}
        <div className="border-t border-gray-700 pt-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Star aria-hidden="true" className="h-4 w-4" />
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
                  <Check aria-hidden="true" className={`h-3 w-3 ${
                    effectiveTier === 'family' ? 'text-purple-400' :
                    effectiveTier === 'pro' ? 'text-emerald-400' : 'text-gray-400'
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
                  Manage in Polar
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
                View full billing history and invoices in Polar
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
            Secure payments processed by Polar. Your payment information is never stored on our servers.
          </p>
        </div>
      </motion.div>

      {/* Downgrade Option - Only for Family users */}
      {tier === 'family' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-gray-400" />
            Change Plan
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Need fewer features? You can switch to the Pro plan ($18/mo). Changes take effect at your next billing cycle.
          </p>

          <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-800/50 mb-4">
            <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Switching to Pro means you&apos;ll lose:
            </p>
            <ul className="text-xs text-gray-400 space-y-1 ml-5">
              <li>AI-powered features (Rowan AI assistant)</li>
              <li>External integrations</li>
              <li>Reduced to 2 spaces (from 3)</li>
              <li>Reduced to 2 household members (from 6)</li>
              <li>Reduced to 2GB storage (from 5GB)</li>
            </ul>
          </div>

          <button
            onClick={handleManageBilling}
            disabled={isBillingLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-600 text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all disabled:opacity-50"
          >
            {isBillingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Change Plan in Billing Portal
          </button>
        </motion.div>
      )}

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
