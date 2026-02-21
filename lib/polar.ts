/**
 * Polar Payment Integration
 * Handles subscriptions, checkout, and customer portal for Rowan
 *
 * Migrated from Stripe to Polar - January 2026
 */

import type { SubscriptionTier, SubscriptionPeriod } from './types/subscription';
import { logger } from '@/lib/logger';

// Polar SDK - dynamically imported to prevent build errors when not installed
// SDK v0.42+ uses different method signatures than earlier versions
type PolarClient = {
  checkouts: {
    create: (params: {
      products: string[];  // Array of product IDs
      customerEmail?: string;
      successUrl?: string;
      metadata?: Record<string, string>;
    }) => Promise<{ id: string; url: string }>;
  };
  customerSessions: {
    create: (params: { customerId: string }) => Promise<{ customerPortalUrl: string }>;
  };
  subscriptions: {
    update: (params: {
      id: string;
      revoke?: boolean;
      cancelAtPeriodEnd?: boolean;
    }) => Promise<{ id: string; status: string }>;
  };
};

// Polar client - initialized lazily to avoid import errors
let _polarClient: PolarClient | null = null;

export async function getPolarClient(): Promise<PolarClient | null> {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return null;
  }

  if (_polarClient) {
    return _polarClient;
  }

  try {
    // Dynamic import for optional dependency
    const sdk = await import("@polar-sh/sdk") as unknown as { Polar: new (options: { accessToken: string }) => PolarClient };
    const Polar = sdk.Polar;
    _polarClient = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });
    return _polarClient;
  } catch {
    // SDK not installed — optional dependency
    return null;
  }
}

// Plan pricing configuration
export interface PolarPlanDefinition {
  name: string;
  description: string;
  price: number; // Monthly price in dollars
  annualPrice: number; // Annual price in dollars
  trialDays: number;
  features: string[];
}

// Polar Product IDs - set in .env.local after creating products in Polar Dashboard
export const POLAR_PLANS: Record<SubscriptionTier, PolarPlanDefinition> = {
  free: {
    name: "Free",
    description: "Basic family organization",
    price: 0,
    annualPrice: 0,
    trialDays: 0,
    features: [
      "50 active tasks",
      "3 shopping lists",
      "2 family members",
      "1 space",
      "30 day message history",
      "Basic reminders",
    ],
  },
  pro: {
    name: "Pro",
    description: "For growing families",
    price: 18,
    annualPrice: 180, // 2 months free ($216 → $180)
    trialDays: 14,
    features: [
      "Unlimited tasks",
      "Unlimited shopping lists",
      "2 family members",
      "2 spaces",
      "Unlimited message history",
      "Photo uploads",
      "Meal planning",
      "Goals & milestones",
      "Household management",
      "Event proposals",
    ],
  },
  family: {
    name: "Family",
    description: "For large families",
    price: 29,
    annualPrice: 290, // 2 months free ($348 → $290)
    trialDays: 14,
    features: [
      "Everything in Pro",
      "6 family members",
      "3 spaces",
      "5GB storage",
      "AI features",
      "External integrations",
    ],
  },
  owner: {
    name: "Owner",
    description: "Platform owner — full access, excluded from revenue",
    price: 0,
    annualPrice: 0,
    trialDays: 0,
    features: [
      "Everything unlocked",
      "Unlimited users & spaces",
      "Unlimited storage",
      "Not purchasable — admin-assigned only",
    ],
  },
};

// Map Polar product ID to subscription tier
// IMPORTANT: Read env vars at runtime to avoid module load order issues
export function getPlanFromProductId(productId: string): SubscriptionTier {
  if (!productId) return "free";

  const proMonthly = process.env.POLAR_PRO_MONTHLY_PRODUCT_ID;
  const proAnnual = process.env.POLAR_PRO_ANNUAL_PRODUCT_ID;
  const familyMonthly = process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID;
  const familyAnnual = process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID;

  if (productId === proMonthly || productId === proAnnual) return "pro";
  if (productId === familyMonthly || productId === familyAnnual) return "family";
  return "free";
}

// Get the appropriate product ID based on plan and billing interval
export function getProductId(plan: SubscriptionTier, interval: SubscriptionPeriod): string | null {
  if (plan === "free" || plan === "owner") return null;

  if (plan === "pro") {
    return interval === "annual"
      ? process.env.POLAR_PRO_ANNUAL_PRODUCT_ID || null
      : process.env.POLAR_PRO_MONTHLY_PRODUCT_ID || null;
  }

  if (plan === "family") {
    return interval === "annual"
      ? process.env.POLAR_FAMILY_ANNUAL_PRODUCT_ID || null
      : process.env.POLAR_FAMILY_MONTHLY_PRODUCT_ID || null;
  }

  return null;
}

// Get trial days for a plan
export function getPolarTrialDays(plan: SubscriptionTier): number {
  return POLAR_PLANS[plan]?.trialDays || 0;
}

// Calculate savings for annual billing
export function getPolarAnnualSavings(plan: SubscriptionTier): {
  amount: number;
  percentage: number;
  monthsFree: number;
} {
  const planDef = POLAR_PLANS[plan];
  if (!planDef || planDef.price === 0) {
    return { amount: 0, percentage: 0, monthsFree: 0 };
  }
  const monthlyTotal = planDef.price * 12;
  const annualTotal = planDef.annualPrice;
  const savings = monthlyTotal - annualTotal;
  const percentage = Math.round((savings / monthlyTotal) * 100);
  const monthsFree = Math.round(savings / planDef.price);
  return { amount: savings, percentage, monthsFree };
}

// Create a checkout session URL
export async function createCheckoutUrl(
  productId: string,
  customerEmail: string,
  successUrl: string,
  metadata?: Record<string, string>
): Promise<string | null> {
  const polar = await getPolarClient();
  if (!polar) {
    logger.error("Polar client not initialized", new Error("Polar client not initialized"), { component: 'polar', action: 'create_checkout' });
    return null;
  }

  try {
    // Polar SDK v0.42+ uses products array instead of single productId
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail,
      successUrl,
      metadata,
    });

    return checkout.url;
  } catch (error) {
    logger.error("Failed to create Polar checkout", error instanceof Error ? error : new Error(String(error)), { component: 'polar', action: 'create_checkout' });
    return null;
  }
}

// Create a customer portal URL for managing subscriptions
export async function createCustomerPortalUrl(customerId: string): Promise<string | null> {
  const polar = await getPolarClient();
  if (!polar) {
    logger.error("Polar client not initialized", new Error("Polar client not initialized"), { component: 'polar', action: 'create_customer_portal' });
    return null;
  }

  try {
    const session = await polar.customerSessions.create({
      customerId,
    });

    return session.customerPortalUrl;
  } catch (error) {
    logger.error("Failed to create Polar customer portal session", error instanceof Error ? error : new Error(String(error)), { component: 'polar', action: 'create_customer_portal' });
    return null;
  }
}

// Cancel/revoke a subscription (for account deletion)
export async function cancelSubscription(
  subscriptionId: string,
  options: { immediate?: boolean } = {}
): Promise<boolean> {
  const polar = await getPolarClient();
  if (!polar) {
    logger.error("Polar client not initialized", new Error("Polar client not initialized"), { component: 'polar', action: 'cancel_subscription' });
    return false;
  }

  try {
    // Polar SDK v0.42+ uses flat parameters for subscription updates
    await polar.subscriptions.update({
      id: subscriptionId,
      ...(options.immediate
        ? { revoke: true }
        : { cancelAtPeriodEnd: true }),
    });
    return true;
  } catch (error) {
    logger.error("Failed to cancel Polar subscription", error instanceof Error ? error : new Error(String(error)), { component: 'polar', action: 'cancel_subscription' });
    return false;
  }
}
