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

// Polar environment helpers — set POLAR_ENV=sandbox in .env.local to
// route the SDK at sandbox-api.polar.sh and use POLAR_SANDBOX_* env vars
// throughout. Production (default) uses POLAR_ACCESS_TOKEN, POLAR_*_PRODUCT_ID
// against api.polar.sh.
export function isPolarSandbox(): boolean {
  return process.env.POLAR_ENV === 'sandbox';
}

export function getPolarAccessToken(): string | undefined {
  return isPolarSandbox()
    ? process.env.POLAR_SANDBOX_ACCESS_TOKEN
    : process.env.POLAR_ACCESS_TOKEN;
}

export function getPolarWebhookSecret(): string | undefined {
  return isPolarSandbox()
    ? process.env.POLAR_SANDBOX_WEBHOOK_SECRET
    : process.env.POLAR_WEBHOOK_SECRET;
}

// Polar client - initialized lazily to avoid import errors
// Cache key includes the environment so toggling POLAR_ENV at runtime
// (e.g. between tests) doesn't return a stale-environment client.
let _polarClient: PolarClient | null = null;
let _polarClientEnv: string | undefined = undefined;

export async function getPolarClient(): Promise<PolarClient | null> {
  const token = getPolarAccessToken();
  if (!token) {
    return null;
  }

  const currentEnv = isPolarSandbox() ? 'sandbox' : 'production';
  if (_polarClient && _polarClientEnv === currentEnv) {
    return _polarClient;
  }

  try {
    // Dynamic import for optional dependency. SDK constructor accepts
    // server: 'sandbox' | 'production' to route the API base URL.
    const sdk = await import("@polar-sh/sdk") as unknown as {
      Polar: new (options: { accessToken: string; server?: 'sandbox' | 'production' }) => PolarClient;
    };
    const Polar = sdk.Polar;
    _polarClient = new Polar({
      accessToken: token,
      server: currentEnv,
    });
    _polarClientEnv = currentEnv;
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
  plus: {
    // Renamed from `pro` -> `plus` (3 June 2026). Display name "Plus"; the
    // Polar products were repriced + renamed live via the API to match, and the
    // env-var identifiers (POLAR_PRO_*_PRODUCT_ID) intentionally keep their
    // names since they point at unchanged Polar product IDs.
    name: "Plus",
    description: "For growing families",
    price: 8,
    annualPrice: 60, // annual ~$5/mo effective vs $8/mo monthly
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
    price: 12,
    annualPrice: 96, // annual ~$8/mo effective vs $12/mo monthly (Phase 11.5 reprice)
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

// Per-environment product-ID resolution. POLAR_ENV=sandbox swaps to
// POLAR_SANDBOX_* product IDs for everything below.
function envProductId(envSuffix: 'PRO_MONTHLY' | 'PRO_ANNUAL' | 'FAMILY_MONTHLY' | 'FAMILY_ANNUAL'): string | undefined {
  return isPolarSandbox()
    ? process.env[`POLAR_SANDBOX_${envSuffix}_PRODUCT_ID`]
    : process.env[`POLAR_${envSuffix}_PRODUCT_ID`];
}

// Map Polar product ID to subscription tier
// IMPORTANT: Read env vars at runtime to avoid module load order issues
export function getPlanFromProductId(productId: string): SubscriptionTier {
  if (!productId) return "free";

  const proMonthly = envProductId('PRO_MONTHLY');
  const proAnnual = envProductId('PRO_ANNUAL');
  const familyMonthly = envProductId('FAMILY_MONTHLY');
  const familyAnnual = envProductId('FAMILY_ANNUAL');

  if (productId === proMonthly || productId === proAnnual) return "plus";
  if (productId === familyMonthly || productId === familyAnnual) return "family";
  return "free";
}

// Map Polar product ID to billing period (monthly | annual).
// Mirrors getPlanFromProductId — env-var based, runtime-resolved.
// Returns 'monthly' for unknown product IDs (safest default — won't inflate ARR).
export function getPeriodFromProductId(productId: string): SubscriptionPeriod {
  if (!productId) return "monthly";

  const proAnnual = envProductId('PRO_ANNUAL');
  const familyAnnual = envProductId('FAMILY_ANNUAL');

  if (productId === proAnnual || productId === familyAnnual) return "annual";
  return "monthly";
}

// Get the appropriate product ID based on plan and billing interval
export function getProductId(plan: SubscriptionTier, interval: SubscriptionPeriod): string | null {
  if (plan === "free" || plan === "owner") return null;

  if (plan === "plus") {
    return interval === "annual"
      ? envProductId('PRO_ANNUAL') || null
      : envProductId('PRO_MONTHLY') || null;
  }

  if (plan === "family") {
    return interval === "annual"
      ? envProductId('FAMILY_ANNUAL') || null
      : envProductId('FAMILY_MONTHLY') || null;
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
