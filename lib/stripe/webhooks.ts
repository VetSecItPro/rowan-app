/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for subscription management
 *
 * SECURITY: Server-side only - validates webhook signatures
 */

import { getStripeClient } from './client';
import { createClient } from '../supabase/server';
import type Stripe from 'stripe';

/**
 * Verify Stripe webhook signature
 *
 * @param body - Raw request body
 * @param signature - Stripe signature header
 * @returns Stripe event object
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      'Missing STRIPE_WEBHOOK_SECRET environment variable. ' +
      'Get your webhook secret from: https://dashboard.stripe.com/webhooks'
    );
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle Stripe webhook events
 *
 * @param event - Verified Stripe event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createClient();
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  const period = session.metadata?.period;

  if (!userId || !tier || !period) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Create subscription record
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier,
      period,
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (subError) {
    console.error('Error creating subscription:', subError);
    return;
  }

  // Log subscription event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_created',
    trigger_source: 'stripe_webhook',
    tier_from: 'free',
    tier_to: tier,
    metadata: {
      session_id: session.id,
      customer_id: session.customer,
      subscription_id: session.subscription,
    },
  });

  console.log(`Subscription created for user ${userId}: ${tier} ${period}`);
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  // Subscription should already exist from checkout.session.completed
  // This just ensures it's in the correct state
  const periodStart = (subscription as any).current_period_start;
  const periodEnd = (subscription as any).current_period_end;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      subscription_started_at: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
      subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  // Map Stripe status to our status
  const status = mapStripeStatus(subscription.status);
  const periodEnd = (subscription as any).current_period_end;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    return;
  }

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_updated',
    trigger_source: 'stripe_webhook',
    metadata: {
      subscription_id: subscription.id,
      new_status: status,
      stripe_status: subscription.status,
    },
  });

  console.log(`Subscription updated for user ${userId}: ${status}`);
}

/**
 * Handle subscription deleted/cancelled event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  // Get current subscription to know the tier
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // Update to canceled status (keep record for history)
  const periodEnd = (subscription as any).current_period_end;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    return;
  }

  // Log cancellation event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_cancelled',
    trigger_source: 'stripe_webhook',
    tier_from: currentSub?.tier || 'unknown',
    tier_to: 'free',
    metadata: {
      subscription_id: subscription.id,
      canceled_at: subscription.canceled_at,
      ended_at: subscription.ended_at,
    },
  });

  console.log(`Subscription canceled for user ${userId}`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = createClient();
  const subscriptionId = (invoice as any).subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return; // Not a subscription invoice
  }

  // Ensure subscription is marked as active
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription on payment success:', error);
  }

  console.log(`Payment succeeded for subscription ${subscriptionId}`);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = createClient();
  const subscriptionId = (invoice as any).subscription;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return; // Not a subscription invoice
  }

  // Mark subscription as past_due
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id, tier')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.error('Subscription not found for invoice:', invoice.id);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription on payment failure:', error);
    return;
  }

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: subscription.user_id,
    event_type: 'payment_failed',
    trigger_source: 'stripe_webhook',
    metadata: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  console.log(`Payment failed for subscription ${subscriptionId}`);
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'paused' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    case 'paused':
    case 'incomplete':
      return 'paused';
    default:
      return 'canceled';
  }
}
