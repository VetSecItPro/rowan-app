/**
 * Stripe Checkout Session Management
 * Handles creation of checkout sessions for subscriptions
 *
 * SECURITY: Server-side only - never expose to client
 */

import { getStripeClient } from './client';
import { getPriceId } from './products';
import type { SubscriptionTier, SubscriptionPeriod } from '../types';
import { logger } from '@/lib/logger';

/**
 * Create a Stripe checkout session for subscription
 *
 * @param userId - User ID from Supabase
 * @param email - User email
 * @param tier - Subscription tier ('pro' or 'family')
 * @param period - Billing period ('monthly' or 'annual')
 * @returns Stripe checkout session ID
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  tier: Exclude<SubscriptionTier, 'free'>,
  period: SubscriptionPeriod
): Promise<string> {
  try {
    const stripe = getStripeClient();

    // Get price ID for tier and period
    const priceId = getPriceId(tier, period);

    // Create or retrieve Stripe customer
    const customer = await getOrCreateCustomer(email, userId);

    // Success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/payment/success?tier=${tier}&period=${period}`;
    const cancelUrl = `${baseUrl}/pricing`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
        period,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
          period,
        },
      },
      allow_promotion_codes: true, // Allow discount codes
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
      },
    });

    return session.id;
  } catch (error) {
    logger.error('Error creating checkout session:', error, { component: 'lib-checkout', action: 'service_call' });
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Get existing Stripe customer or create a new one
 *
 * @param email - Customer email
 * @param userId - User ID for metadata
 * @returns Stripe customer object
 */
async function getOrCreateCustomer(
  email: string,
  userId: string
): Promise<{ id: string }> {
  try {
    const stripe = getStripeClient();

    // Search for existing customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    // Return existing customer if found
    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer;
  } catch (error) {
    logger.error('Error getting/creating customer:', error, { component: 'lib-checkout', action: 'service_call' });
    throw new Error('Failed to get or create Stripe customer');
  }
}

/**
 * Get checkout session details
 *
 * @param sessionId - Stripe session ID
 * @returns Checkout session object
 */
export async function getCheckoutSession(sessionId: string) {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    logger.error('Error retrieving checkout session:', error, { component: 'lib-checkout', action: 'service_call' });
    throw new Error('Failed to retrieve checkout session');
  }
}
