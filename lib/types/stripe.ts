/**
 * Stripe Integration Type Definitions
 * Created: 2024-12-02
 *
 * Type definitions for Stripe payment processing and webhooks.
 */

import type { SubscriptionTier, SubscriptionPeriod } from './subscription';

// ============================================================================
// STRIPE PRODUCT & PRICING
// ============================================================================

/**
 * Stripe product information
 */
export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  tier: Exclude<SubscriptionTier, 'free'>; // 'pro' | 'family'
  features: string[];
}

/**
 * Stripe price information
 */
export interface StripePrice {
  id: string;
  productId: string;
  amount: number; // in cents (e.g., 1199 for $11.99)
  currency: string; // 'usd'
  interval: 'month' | 'year';
  period: SubscriptionPeriod;
}

/**
 * Complete price info for a tier
 */
export interface StripePriceInfo {
  tier: Exclude<SubscriptionTier, 'free'>;
  monthly: {
    priceId: string;
    amount: number; // in cents
    displayAmount: string; // formatted: "$11.99"
  };
  annual: {
    priceId: string;
    amount: number; // in cents
    displayAmount: string; // formatted: "$119"
    monthlyEquivalent: string; // "$9.92/mo"
    savings: string; // "Save $24/year"
    savingsPercentage: number; // 17
  };
}

// ============================================================================
// STRIPE CHECKOUT
// ============================================================================

/**
 * Stripe checkout session configuration
 */
export interface StripeCheckoutSessionConfig {
  userId: string;
  email: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  period: SubscriptionPeriod;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Stripe checkout session (returned from Stripe API)
 */
export interface StripeCheckoutSession {
  id: string;
  object: 'checkout.session';
  customer: string | null;
  customer_email: string | null;
  mode: 'subscription';
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  subscription: string | null;
  url: string | null;
  metadata: Record<string, string>;
}

// ============================================================================
// STRIPE CUSTOMER
// ============================================================================

/**
 * Stripe customer
 */
export interface StripeCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  created: number; // Unix timestamp
}

// ============================================================================
// STRIPE SUBSCRIPTION
// ============================================================================

/**
 * Stripe subscription object
 */
export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        recurring: {
          interval: 'month' | 'year';
        };
      };
    }>;
  };
  current_period_start: number; // Unix timestamp
  current_period_end: number; // Unix timestamp
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  metadata: Record<string, string>;
}

// ============================================================================
// STRIPE INVOICE
// ============================================================================

/**
 * Stripe invoice
 */
export interface StripeInvoice {
  id: string;
  object: 'invoice';
  customer: string;
  subscription: string | null;
  amount_due: number; // in cents
  amount_paid: number; // in cents
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paid: boolean;
  period_start: number; // Unix timestamp
  period_end: number; // Unix timestamp
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded';

/**
 * Stripe webhook event
 */
export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  type: StripeWebhookEventType;
  data: {
    object: StripeCheckoutSession | StripeSubscription | StripeInvoice;
  };
  created: number; // Unix timestamp
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

// ============================================================================
// STRIPE ERRORS
// ============================================================================

/**
 * Stripe error types
 */
export type StripeErrorType =
  | 'card_error'
  | 'invalid_request_error'
  | 'api_error'
  | 'authentication_error'
  | 'rate_limit_error';

/**
 * Stripe error
 */
export interface StripeError {
  type: StripeErrorType;
  code?: string;
  message: string;
  param?: string;
  decline_code?: string;
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Stripe payment method (card)
 */
export interface StripePaymentMethod {
  id: string;
  object: 'payment_method';
  type: 'card';
  card: {
    brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay' | 'unknown';
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}
