/**
 * API Route: Polar Webhook Handler
 * POST /api/webhooks/polar
 *
 * Handles Polar webhook events for subscription lifecycle management.
 *
 * Signature verification uses Polar's standardwebhooks-format signing
 * via @polar-sh/sdk/webhooks `validateEvent`. Polar sends headers
 * `webhook-id`, `webhook-timestamp`, `webhook-signature` (with
 * `v1,<base64>` value). Custom HMAC-of-body verification (which the
 * pre-2026-05-07 implementation used) silently rejects every real
 * webhook, so subscriptions never activate after payment.
 *
 * Before using:
 * 1. Set POLAR_WEBHOOK_SECRET in .env.local (format: polar_whs_<random>)
 * 2. Configure webhook endpoint in Polar dashboard pointing at this route
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanFromProductId, getPeriodFromProductId, getPolarWebhookSecret } from '@/lib/polar';
import { sendSubscriptionWelcomeEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail } from '@/lib/services/email-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import type { SubscriptionTier, SubscriptionPeriod, SubscriptionStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

// Polar webhook event shape after validateEvent — matches the SDK's
// returned union type but our handler only reads .type and .data.
interface PolarWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP as defense-in-depth (signature verification is primary auth)
  const ip = extractIP(request.headers);
  const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
  if (!rateLimitSuccess) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.text();
  const webhookSecret = getPolarWebhookSecret();

  if (!webhookSecret) {
    logger.error('Polar webhook secret not configured (check POLAR_WEBHOOK_SECRET or POLAR_SANDBOX_WEBHOOK_SECRET when POLAR_ENV=sandbox)', undefined, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Polar SDK's validateEvent uses standardwebhooks-format signature
  // verification — combines the webhook-id, webhook-timestamp, and body
  // headers, computes HMAC against the decoded secret, and compares
  // against the v1,<base64> signature header. Throws WebhookVerificationError
  // on bad signature, returns the typed event on success.
  const headersRecord: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersRecord[key] = value;
  });

  let event: PolarWebhookEvent;
  try {
    event = validateEvent(body, headersRecord, webhookSecret) as unknown as PolarWebhookEvent;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      logger.error('Polar webhook signature verification failed', err, {
        component: 'PolarWebhook',
      });
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }
    logger.error('Failed to parse webhook event', err, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Invalid webhook payload' },
      { status: 400 }
    );
  }

  try {
    const eventData = event.data;

    logger.info(`Processing Polar webhook: ${event.type}`, {
      component: 'PolarWebhook',
      eventType: event.type,
    });

    switch (event.type) {
      case 'checkout.updated': {
        // Checkout completed - process subscription
        const status = eventData.status as string;

        if (status !== 'succeeded') {
          // Only process successful checkouts
          break;
        }

        const metadata = eventData.metadata as Record<string, string> | undefined;
        const userId = metadata?.userId;
        const customerId = eventData.customerId as string;
        const productId = eventData.productId as string;
        const billingInterval = metadata?.billingInterval as SubscriptionPeriod | undefined;

        if (!userId) {
          logger.error('No userId in checkout metadata', undefined, {
            component: 'PolarWebhook',
          });
          break;
        }

        // Store the customer ID in the subscription record
        if (customerId) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              polar_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (error) {
            logger.error('Failed to update polar_customer_id', error, {
              component: 'PolarWebhook',
              userId,
            });
          }
        }

        // Get plan from product ID
        const plan = getPlanFromProductId(productId);

        logger.info('Checkout completed', {
          component: 'PolarWebhook',
          userId,
          plan,
          productId,
          billingInterval,
        });
        break;
      }

      case 'subscription.created':
      case 'subscription.active': {
        // Subscription is active - update user's subscription status
        const customerId = eventData.customerId as string;
        const subscriptionId = eventData.id as string;
        const productId = eventData.productId as string;
        const currentPeriodStart = eventData.currentPeriodStart as string | undefined;
        const currentPeriodEnd = eventData.currentPeriodEnd as string | undefined;
        const subMetadata = eventData.metadata as Record<string, string> | undefined;

        const plan = getPlanFromProductId(productId);

        // Find user by Polar customer ID, with fallback to metadata userId.
        // checkout.updated writes polar_customer_id, but subscription.created
        // can fire before that write completes (race condition). The fallback
        // resolves the user directly from checkout metadata, eliminating the race.
        let subscription: { user_id: string; is_founding_member: boolean } | null = null;

        // Attempt 1: Look up by polar_customer_id (fast path — works when checkout.updated already ran)
        const { data: byCustomerId } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, is_founding_member')
          .eq('polar_customer_id', customerId)
          .single();

        if (byCustomerId) {
          subscription = byCustomerId;
        }

        // Attempt 2: Fallback to metadata userId (eliminates the race entirely)
        if (!subscription && subMetadata?.userId) {
          const { data: byUserId } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, is_founding_member')
            .eq('user_id', subMetadata.userId)
            .single();

          if (byUserId) {
            subscription = byUserId;

            // Backfill the polar_customer_id so future lookups work via the fast path
            await supabaseAdmin
              .from('subscriptions')
              .update({
                polar_customer_id: customerId,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', byUserId.user_id);

            logger.info('Resolved subscription via metadata userId fallback', {
              component: 'PolarWebhook',
              userId: byUserId.user_id,
              customerId,
            });
          }
        }

        // Attempt 3: One retry with delay (handles edge cases where both lookups miss)
        if (!subscription) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const { data: retryData, error: retryError } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, is_founding_member')
            .eq('polar_customer_id', customerId)
            .single();

          if (retryData) {
            subscription = retryData;
          } else {
            logger.error(`No subscription found for Polar customer ${customerId}`, retryError, {
              component: 'PolarWebhook',
              customerId,
              metadataUserId: subMetadata?.userId,
            });
            return NextResponse.json(
              { error: 'Customer not found - retry later' },
              { status: 500 }
            );
          }
        }

        // Idempotency guard: if subscription is already active with this polar_subscription_id,
        // this webhook was already processed (Polar retry or duplicate delivery). Skip to avoid
        // double-claiming founding member spots and sending duplicate welcome emails.
        {
          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select('polar_subscription_id, status')
            .eq('user_id', subscription.user_id)
            .single();

          if (existing?.polar_subscription_id === subscriptionId && existing?.status === 'active') {
            logger.info('Subscription event already processed (idempotency guard)', {
              component: 'PolarWebhook',
              userId: subscription.user_id,
              subscriptionId,
            });
            break;
          }
        }

        // Check if user is already a founding member
        let foundingMemberNumber: number | null = null;
        let isFoundingMember = subscription.is_founding_member || false;

        // Only try to claim founding member status for new paid subscriptions (pro or family)
        if (!isFoundingMember && (plan === 'plus' || plan === 'family')) {
          // Try to claim a founding member number atomically
          const { data: claimResult, error: claimError } = await supabaseAdmin
            .rpc('claim_founding_member_number');

          if (!claimError && claimResult) {
            foundingMemberNumber = claimResult;
            isFoundingMember = true;

            logger.info('Claimed founding member number', {
              component: 'PolarWebhook',
              userId: subscription.user_id,
              foundingMemberNumber,
            });
          } else if (claimError) {
            // Function might not exist yet (migration not run) - log and continue
            logger.warn('Could not claim founding member number (function may not exist)', {
              component: 'PolarWebhook',
              error: claimError.message,
            });
          }
          // If claimResult is null, founding member spots are full - not an error
        }

        // GUARD: Never overwrite 'owner' tier from webhook events
        {
          const { data: currentSub } = await supabaseAdmin
            .from('subscriptions')
            .select('tier')
            .eq('user_id', subscription.user_id)
            .single();

          if (currentSub?.tier === 'owner') {
            logger.info('Skipping tier update — user is on owner tier', {
              component: 'PolarWebhook',
              userId: subscription.user_id,
            });
            break;
          }
        }

        // Update subscription with founding member info
        const updateData: Record<string, unknown> = {
          polar_subscription_id: subscriptionId,
          tier: plan,
          status: 'active',
          subscription_started_at: currentPeriodStart || new Date().toISOString(),
          subscription_ends_at: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        };

        // Add founding member fields if they became a founding member
        if (foundingMemberNumber) {
          updateData.is_founding_member = true;
          updateData.founding_member_number = foundingMemberNumber;
          updateData.founding_member_locked_price_id = productId;
        }

        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('user_id', subscription.user_id);

        if (updateError) {
          logger.error('Failed to update subscription', updateError, {
            component: 'PolarWebhook',
            userId: subscription.user_id,
          });
          // Return 500 so Polar retries the webhook
          return NextResponse.json(
            { error: 'Failed to activate subscription' },
            { status: 500 }
          );
        }

        // SECURITY: Re-check subscription state before sending email to prevent
        // duplicate welcome emails from concurrent webhook deliveries (TOCTOU guard)
        const { data: freshSub } = await supabaseAdmin
          .from('subscriptions')
          .select('polar_subscription_id, status, updated_at')
          .eq('user_id', subscription.user_id)
          .single();

        // If the subscription was already updated by a concurrent webhook
        // (polar_subscription_id matches and status is active from a different update),
        // check if the update timestamp is older than 5 seconds — if so, skip email
        const updateAge = freshSub?.updated_at
          ? Date.now() - new Date(freshSub.updated_at).getTime()
          : 0;
        const isLikelyDuplicate = freshSub?.polar_subscription_id === subscriptionId
          && freshSub?.status === 'active'
          && updateAge > 5000;

        // Get user info for email
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', subscription.user_id)
          .single();

        if (userData?.email && !isLikelyDuplicate) {
          // Send welcome email (non-blocking). Founding members get celebratory
          // copy + member number; everyone else gets the standard welcome.
          sendSubscriptionWelcomeEmail({
            recipientEmail: userData.email,
            recipientName: userData.full_name || 'there',
            tier: plan as 'plus' | 'family',
            period: getPeriodFromProductId(productId),
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            isFoundingMember,
            foundingMemberNumber: isFoundingMember && foundingMemberNumber != null ? foundingMemberNumber : undefined,
          }).catch(err => {
            logger.error('Failed to send welcome email', err, {
              component: 'PolarWebhook',
            });
          });
        }

        logger.info('Subscription activated', {
          component: 'PolarWebhook',
          userId: subscription.user_id,
          plan,
          subscriptionId,
          isFoundingMember,
          foundingMemberNumber,
        });
        break;
      }

      case 'subscription.updated': {
        // Subscription was updated (plan change, renewal, or payment status change)
        const customerId = eventData.customerId as string;
        const productId = eventData.productId as string;
        const currentPeriodStart = eventData.currentPeriodStart as string | undefined;
        const currentPeriodEnd = eventData.currentPeriodEnd as string | undefined;
        const polarStatus = (eventData.status as string | undefined) ?? 'active';

        const plan = getPlanFromProductId(productId);

        // DUNNING (Phase 11.3): keep access during 'past_due' — Polar is still
        // retrying the card. Any non-past_due status here maps to 'active';
        // the cancel/revoke branches own the downgrade path explicitly.
        const ourStatus: SubscriptionStatus = polarStatus === 'past_due' ? 'past_due' : 'active';

        // Read existing row first: skip owner accounts, and detect the
        // transition INTO past_due so the recovery email fires once (not on
        // every retry webhook).
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, tier, status')
          .eq('polar_customer_id', customerId)
          .single();

        if (existing?.tier === 'owner') {
          logger.info('Skipping subscription.updated — owner tier', {
            component: 'PolarWebhook',
            userId: existing.user_id,
          });
          break;
        }

        // GUARD: getPlanFromProductId returns 'free' for an unrecognized/missing
        // productId (e.g. a metadata-only or dunning update event, or env drift).
        // A real downgrade to free always arrives via cancel/revoke, never via
        // 'updated' — so never let an unresolved product silently downgrade a
        // paying customer. Keep their existing tier in that case.
        const resolvedTier =
          plan === 'free' && existing?.tier && existing.tier !== 'free'
            ? (existing.tier as typeof plan)
            : plan;

        // Only overwrite the period fields when the event actually carries them.
        // A past_due update without period data must NOT null subscription_ends_at,
        // which the cancel-until-period-end entitlement (getUserTier) depends on.
        const updatePayload: Record<string, unknown> = {
          tier: resolvedTier,
          status: ourStatus,
          updated_at: new Date().toISOString(),
        };
        if (currentPeriodStart) updatePayload.subscription_started_at = currentPeriodStart;
        if (currentPeriodEnd) updatePayload.subscription_ends_at = currentPeriodEnd;

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update(updatePayload)
          .eq('polar_customer_id', customerId);

        if (error) {
          logger.error('Failed to update subscription', error, {
            component: 'PolarWebhook',
            customerId,
          });
          break;
        }

        // Newly past_due -> send the "update your card" recovery email once.
        if (ourStatus === 'past_due' && existing?.status !== 'past_due' && existing?.user_id && resolvedTier !== 'free') {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', existing.user_id)
            .single();

          if (userData?.email) {
            sendPaymentFailedEmail({
              recipientEmail: userData.email,
              recipientName: userData.full_name || 'there',
              tier: resolvedTier as 'plus' | 'family',
              attemptCount: (eventData.paymentAttemptCount as number | undefined) ?? 1,
              updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
              gracePeriodDays: 7,
            }).catch((err) => {
              logger.error('Failed to send payment-failed email', err, {
                component: 'PolarWebhook',
              });
            });
          }
        }

        logger.info('Subscription updated', {
          component: 'PolarWebhook',
          customerId,
          plan,
          status: ourStatus,
        });
        break;
      }

      case 'subscription.canceled': {
        // CANCEL (Phase 11.4): the user turned off auto-renew. They KEEP access
        // until the paid-through date — Polar leaves the subscription billable
        // until then and sends subscription.revoked when it actually ends. We do
        // NOT downgrade to free here (the old code did, losing paid-for access).
        const customerId = eventData.customerId as string;
        const currentPeriodEnd = eventData.currentPeriodEnd as string | undefined;

        const { data: currentSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, tier, subscription_ends_at')
          .eq('polar_customer_id', customerId)
          .single();

        // GUARD: Never touch owner tier
        if (currentSub?.tier === 'owner') {
          logger.info('Skipping cancel — user is on owner tier', {
            component: 'PolarWebhook',
            userId: currentSub.user_id,
          });
          break;
        }

        const accessUntil =
          currentPeriodEnd ?? currentSub?.subscription_ends_at ?? new Date().toISOString();

        // Mark canceled but KEEP the tier and the paid-through date. getUserTier
        // honors a canceled subscription until subscription_ends_at. Keep
        // polar_subscription_id so an un-cancel can reactivate it.
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            subscription_ends_at: accessUntil,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_customer_id', customerId);

        if (error) {
          logger.error('Failed to mark subscription canceled', error, {
            component: 'PolarWebhook',
            customerId,
          });
          break;
        }

        // Send the cancellation email ("you have access until X").
        if (currentSub?.user_id) {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', currentSub.user_id)
            .single();

          if (userData?.email && currentSub.tier !== 'free' && currentSub.tier !== 'owner') {
            sendSubscriptionCancelledEmail({
              recipientEmail: userData.email,
              recipientName: userData.full_name || 'there',
              tier: currentSub.tier as 'plus' | 'family',
              accessUntil,
              resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
            }).catch((err) => {
              logger.error('Failed to send cancellation email', err, {
                component: 'PolarWebhook',
              });
            });
          }
        }

        logger.info('Subscription canceled — access retained until period end', {
          component: 'PolarWebhook',
          customerId,
          accessUntil,
        });
        break;
      }

      case 'subscription.revoked': {
        // REVOKE (Phase 11.4): access ends now (period elapsed, or an immediate
        // revoke / dunning give-up). This is the real downgrade to free.
        const customerId = eventData.customerId as string;

        const { data: currentSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, tier')
          .eq('polar_customer_id', customerId)
          .single();

        if (currentSub?.tier === 'owner') {
          logger.info('Skipping revoke — user is on owner tier', {
            component: 'PolarWebhook',
            userId: currentSub.user_id,
          });
          break;
        }

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            polar_subscription_id: null,
            tier: 'free' as SubscriptionTier,
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('polar_customer_id', customerId);

        if (error) {
          logger.error('Failed to revoke subscription', error, {
            component: 'PolarWebhook',
            customerId,
          });
          break;
        }

        logger.info('Subscription revoked — downgraded to free', {
          component: 'PolarWebhook',
          customerId,
        });
        break;
      }

      case 'order.refunded': {
        // Handle refund - similar to subscription.revoked
        const customerId = eventData.customerId as string;
        const subscriptionId = eventData.subscriptionId as string | undefined;

        // If this is a subscription refund, cancel the subscription
        if (subscriptionId) {
          // SECURITY (sec-ship 3 Jun): mirror the owner-tier guard the other
          // billing branches enforce. Without it a refund silently downgrades a
          // platform-owner account to free. Owners are never billing-managed.
          const { data: currentSub } = await supabaseAdmin
            .from('subscriptions')
            .select('tier')
            .eq('polar_customer_id', customerId)
            .single();

          if (currentSub?.tier === 'owner') {
            logger.info('Skipping refund downgrade — user is on owner tier', {
              component: 'PolarWebhook',
              customerId,
            });
            break;
          }

          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              polar_subscription_id: null,
              tier: 'free' as SubscriptionTier,
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('polar_customer_id', customerId);

          if (error) {
            logger.error('Failed to process refund', error, {
              component: 'PolarWebhook',
              customerId,
            });
          }
        }

        logger.info('Order refunded', {
          component: 'PolarWebhook',
          customerId,
          orderId: eventData.id as string,
        });
        break;
      }

      default:
        logger.info(`Unhandled Polar event type: ${event.type}`, {
          component: 'PolarWebhook',
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Polar webhook handler error', error, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
