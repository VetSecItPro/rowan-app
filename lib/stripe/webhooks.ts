/**
 * Stripe Webhook Handler
 *
 * SECURITY: Server-side only - validates webhook signatures
 *
 * Processes Stripe webhook events for subscription lifecycle management:
 * - checkout.session.completed: New subscription purchase
 * - customer.subscription.created: Subscription initialized
 * - customer.subscription.updated: Status/plan changes
 * - customer.subscription.deleted: Cancellation
 * - invoice.payment_succeeded: Successful payment
 * - invoice.payment_failed: Payment failure requiring user action
 *
 * IMPORTANT: All webhook handlers must be idempotent - Stripe may send duplicate events
 *
 * @see https://stripe.com/docs/webhooks
 * @see https://stripe.com/docs/api/events/types
 */

import { getStripeClient } from './client';
import { createClient } from '../supabase/server';
import {
  sendSubscriptionWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
} from '../services/email-service';
import {
  logWebhookReceived,
  logWebhookProcessed,
  logWebhookError,
  logSubscriptionCreated,
  logSubscriptionUpdated,
  logSubscriptionCancelled,
  logPaymentSucceeded,
  logPaymentFailed,
  logCheckoutSuccess,
} from '../utils/monetization-logger';
import { logger } from '../logger';
import type Stripe from 'stripe';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rowanapp.com';

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
    logger.error('Webhook signature verification failed', error, { component: 'stripe-webhooks', action: 'signature_verification' });
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle Stripe webhook events
 *
 * @param event - Verified Stripe event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const startTime = Date.now();

  // Log webhook received
  logWebhookReceived({
    stripeEventId: event.id,
    eventType: event.type,
  });

  try {
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
        logger.info(`Unhandled Stripe event type: ${event.type}`, { component: 'stripe-webhooks', eventType: event.type });
    }

    // Log successful processing
    const processingTimeMs = Date.now() - startTime;
    logWebhookProcessed({
      stripeEventId: event.id,
      eventType: event.type,
      processingTimeMs,
    });
  } catch (error) {
    // Log error
    logWebhookError({
      stripeEventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = await createClient();
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'pro' | 'family' | undefined;
  const period = session.metadata?.period as 'monthly' | 'annual' | undefined;

  if (!userId || !tier || !period) {
    logger.error('Missing metadata in checkout session', undefined, { component: 'stripe-webhooks', action: 'checkout_session', sessionId: session.id });
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
    logger.error('Error creating subscription', subError, { component: 'stripe-webhooks', action: 'create_subscription' });
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

  // Log checkout success with structured logger
  logCheckoutSuccess({
    userId,
    tier,
    period,
    stripeSessionId: session.id,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  });

  // Log subscription created
  logSubscriptionCreated({
    userId,
    tier,
    period,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  });

  // Get user email and name for welcome email
  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  if (user?.email) {
    // Send welcome email
    const emailResult = await sendSubscriptionWelcomeEmail({
      recipientEmail: user.email,
      recipientName: user.name || 'there',
      tier,
      period,
      dashboardUrl: `${BASE_URL}/dashboard`,
    });

    if (emailResult.success) {
      logger.info(`Welcome email sent`, { component: 'stripe-webhooks', action: 'send_welcome_email' });
    } else {
      logger.error('Failed to send welcome email', undefined, { component: 'stripe-webhooks', action: 'send_welcome_email', error: emailResult.error });
    }
  }

  logger.info('Subscription created', { component: 'stripe-webhooks', userId, tier, period });
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    logger.error('Missing userId in subscription metadata', undefined, { component: 'stripe-webhooks', action: 'subscription_event', subscriptionId: subscription.id });
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
    logger.error('Error updating subscription', error, { component: 'stripe-webhooks', action: 'update_subscription' });
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    logger.error('Missing userId in subscription metadata', undefined, { component: 'stripe-webhooks', action: 'subscription_event', subscriptionId: subscription.id });
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
    logger.error('Error updating subscription', error, { component: 'stripe-webhooks', action: 'update_subscription' });
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

  // Log with structured logger
  logSubscriptionUpdated({
    userId,
    tier: subscription.metadata?.tier || 'unknown',
    period: subscription.metadata?.period || 'monthly',
    stripeSubscriptionId: subscription.id,
    metadata: {
      new_status: status,
      stripe_status: subscription.status,
    },
  });

  logger.info('Subscription updated', { component: 'stripe-webhooks', userId, status });
}

/**
 * Handle subscription deleted/cancelled event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    logger.error('Missing userId in subscription metadata', undefined, { component: 'stripe-webhooks', action: 'subscription_event', subscriptionId: subscription.id });
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
  const accessUntilDate = periodEnd ? new Date(periodEnd * 1000) : new Date();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logger.error('Error canceling subscription', error, { component: 'stripe-webhooks', action: 'cancel_subscription' });
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

  // Log with structured logger
  logSubscriptionCancelled({
    userId,
    tier: currentSub?.tier || 'unknown',
    stripeSubscriptionId: subscription.id,
    periodEndDate: accessUntilDate.toISOString(),
  });

  // Get user email and name for cancellation email
  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  if (user?.email && currentSub?.tier) {
    const tier = currentSub.tier as 'pro' | 'family';
    // Format the access until date nicely
    const accessUntil = accessUntilDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const emailResult = await sendSubscriptionCancelledEmail({
      recipientEmail: user.email,
      recipientName: user.name || 'there',
      tier,
      accessUntil,
      resubscribeUrl: `${BASE_URL}/pricing`,
    });

    if (emailResult.success) {
      logger.info('Cancellation email sent', { component: 'stripe-webhooks', action: 'send_cancellation_email' });
    } else {
      logger.error('Failed to send cancellation email', undefined, { component: 'stripe-webhooks', action: 'send_cancellation_email', error: emailResult.error });
    }
  }

  logger.info('Subscription canceled', { component: 'stripe-webhooks', userId });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = await createClient();
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
    logger.error('Error updating subscription on payment success', error, { component: 'stripe-webhooks', action: 'payment_success' });
  }

  // Log payment success
  logPaymentSucceeded({
    userId: '', // We don't have userId here, but it's tracked via subscription_id
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    stripeSubscriptionId: subscriptionId,
    invoiceId: invoice.id,
  });

  logger.info('Payment succeeded', { component: 'stripe-webhooks', subscriptionId });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const supabase = await createClient();
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
    logger.error('Subscription not found for invoice', undefined, { component: 'stripe-webhooks', action: 'invoice_payment_failed', invoiceId: invoice.id });
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
    logger.error('Error updating subscription on payment failure', error, { component: 'stripe-webhooks', action: 'payment_failure' });
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

  // Log with structured logger
  logPaymentFailed({
    userId: subscription.user_id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency?.toUpperCase() || 'USD',
    stripeSubscriptionId: subscriptionId,
    error: 'Invoice payment failed',
    attemptCount: invoice.attempt_count || 1,
    invoiceId: invoice.id,
  });

  // Get user email and name for payment failed email
  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', subscription.user_id)
    .single();

  if (user?.email && subscription.tier) {
    const tier = subscription.tier as 'pro' | 'family';
    const attemptCount = invoice.attempt_count || 1;

    const emailResult = await sendPaymentFailedEmail({
      recipientEmail: user.email,
      recipientName: user.name || 'there',
      tier,
      attemptCount,
      updatePaymentUrl: `${BASE_URL}/settings/billing`,
      gracePeriodDays: 7, // Standard 7-day grace period
    });

    if (emailResult.success) {
      logger.info('Payment failed email sent', { component: 'stripe-webhooks', action: 'send_payment_failed_email' });
    } else {
      logger.error('Failed to send payment failed email', undefined, { component: 'stripe-webhooks', action: 'send_payment_failed_email', error: emailResult.error });
    }
  }

  logger.info('Payment failed', { component: 'stripe-webhooks', subscriptionId });
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
