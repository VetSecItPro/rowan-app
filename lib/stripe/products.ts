/**
 * Stripe Products & Pricing Configuration
 * Centralized configuration for Rowan subscription tiers
 */

import type { SubscriptionTier, SubscriptionPeriod, StripePriceInfo } from '../types';

// ============================================================================
// PRICE ID CONFIGURATION
// ============================================================================
// These are loaded from environment variables
// Set up products in Stripe Dashboard first, then add price IDs to .env.local

const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
  family: {
    monthly: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_FAMILY_ANNUAL_PRICE_ID || '',
  },
} as const;

// ============================================================================
// PRICING CONSTANTS
// ============================================================================

export const PRICING = {
  pro: {
    monthly: {
      amount: 1199, // $11.99 in cents
      displayAmount: '$11.99',
    },
    annual: {
      amount: 11900, // $119 in cents
      displayAmount: '$119',
      monthlyEquivalent: '$9.92/mo',
      savings: 'Save $24/year',
      savingsPercentage: 17,
    },
  },
  family: {
    monthly: {
      amount: 1799, // $17.99 in cents
      displayAmount: '$17.99',
    },
    annual: {
      amount: 17900, // $179 in cents
      displayAmount: '$179',
      monthlyEquivalent: '$14.92/mo',
      savings: 'Save $36/year',
      savingsPercentage: 17,
    },
  },
} as const;

// ============================================================================
// PRODUCT INFORMATION
// ============================================================================

export const PRODUCT_INFO = {
  pro: {
    name: 'Rowan Pro',
    description: 'Everything you need for household collaboration',
    features: [
      'Unlimited tasks & calendar events',
      'Meal planning & recipes',
      'Reminders & habit tracking',
      'Real-time collaboration',
      '2GB photo storage',
      'Shopping lists & quick actions',
      'Email support',
    ],
    maxUsers: 2,
  },
  family: {
    name: 'Rowan Family',
    description: 'Complete family organization for up to 6 users',
    features: [
      'Everything in Pro',
      'Up to 6 family members',
      'AI recipe import',
      'Receipt scanning',
      'External integrations',
      '5GB photo storage',
      'Priority support',
      'Family analytics',
    ],
    maxUsers: 6,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Stripe price ID for a tier and period
 */
export function getPriceId(
  tier: Exclude<SubscriptionTier, 'free'>,
  period: SubscriptionPeriod
): string {
  const priceId = PRICE_IDS[tier][period];

  if (!priceId) {
    throw new Error(
      `Missing Stripe price ID for ${tier} ${period}. ` +
      `Please add STRIPE_${tier.toUpperCase()}_${period.toUpperCase()}_PRICE_ID ` +
      `to your environment variables.`
    );
  }

  return priceId;
}

/**
 * Get complete price information for a tier
 */
export function getPriceInfo(
  tier: Exclude<SubscriptionTier, 'free'>
): StripePriceInfo {
  const pricing = PRICING[tier];

  return {
    tier,
    monthly: {
      priceId: getPriceId(tier, 'monthly'),
      amount: pricing.monthly.amount,
      displayAmount: pricing.monthly.displayAmount,
    },
    annual: {
      priceId: getPriceId(tier, 'annual'),
      amount: pricing.annual.amount,
      displayAmount: pricing.annual.displayAmount,
      monthlyEquivalent: pricing.annual.monthlyEquivalent,
      savings: pricing.annual.savings,
      savingsPercentage: pricing.annual.savingsPercentage,
    },
  };
}

/**
 * Get product information for a tier
 */
export function getProductInfo(tier: Exclude<SubscriptionTier, 'free'>) {
  return PRODUCT_INFO[tier];
}

/**
 * Get price amount in cents
 */
export function getPriceAmount(
  tier: Exclude<SubscriptionTier, 'free'>,
  period: SubscriptionPeriod
): number {
  return PRICING[tier][period].amount;
}

/**
 * Get display amount (formatted string)
 */
export function getDisplayAmount(
  tier: Exclude<SubscriptionTier, 'free'>,
  period: SubscriptionPeriod
): string {
  return PRICING[tier][period].displayAmount;
}

/**
 * Validate that all required price IDs are configured
 */
export function validatePriceIds(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!PRICE_IDS.pro.monthly) missing.push('STRIPE_PRO_MONTHLY_PRICE_ID');
  if (!PRICE_IDS.pro.annual) missing.push('STRIPE_PRO_ANNUAL_PRICE_ID');
  if (!PRICE_IDS.family.monthly) missing.push('STRIPE_FAMILY_MONTHLY_PRICE_ID');
  if (!PRICE_IDS.family.annual) missing.push('STRIPE_FAMILY_ANNUAL_PRICE_ID');

  return {
    valid: missing.length === 0,
    missing,
  };
}
