/**
 * API Route: Polar Webhook Handler
 * POST /api/webhooks/polar
 *
 * Handles Polar webhook events for subscription lifecycle management
 *
 * IMPORTANT: Before using this handler, ensure you have:
 * 1. Added polar_customer_id and polar_subscription_id columns to subscriptions table
 * 2. Run: npm run db:push (if using migrations) or update Supabase directly
 * 3. Set POLAR_WEBHOOK_SECRET in .env.local
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanFromProductId } from '@/lib/polar';
import { sendSubscriptionWelcomeEmail, sendSubscriptionCancelledEmail } from '@/lib/services/email-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { SubscriptionTier, SubscriptionPeriod } from '@/lib/types';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

// SECURITY: Zod schema to validate webhook payload structure
const PolarWebhookEventSchema = z.object({
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
});

// Polar webhook event types
interface PolarWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

// Verify Polar webhook signature using HMAC-SHA256
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Rate limit by IP as defense-in-depth (signature verification is primary auth)
  const ip = extractIP(request.headers);
  const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
  if (!rateLimitSuccess) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.text();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('POLAR_WEBHOOK_SECRET not configured', undefined, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get signature from headers
  // Polar may use different header names - check their docs
  const signature =
    request.headers.get('x-polar-signature') ||
    request.headers.get('polar-signature') ||
    request.headers.get('x-webhook-signature');

  if (!verifyWebhookSignature(body, signature, webhookSecret)) {
    logger.error('Polar webhook signature verification failed', undefined, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // SECURITY: Parse and validate webhook payload with Zod
  let event: PolarWebhookEvent;
  try {
    const rawParsed = JSON.parse(body);
    const validated = PolarWebhookEventSchema.safeParse(rawParsed);
    if (!validated.success) {
      logger.error('Webhook payload failed Zod validation', undefined, {
        component: 'PolarWebhook',
      });
      return NextResponse.json(
        { error: 'Invalid webhook payload structure' },
        { status: 400 }
      );
    }
    event = rawParsed as PolarWebhookEvent;
  } catch {
    logger.error('Failed to parse webhook body', undefined, {
      component: 'PolarWebhook',
    });
    return NextResponse.json(
      { error: 'Invalid JSON body' },
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
        if (!isFoundingMember && (plan === 'pro' || plan === 'family')) {
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
          // Send welcome email (non-blocking)
          // TODO: Send different email for founding members
          sendSubscriptionWelcomeEmail({
            recipientEmail: userData.email,
            recipientName: userData.full_name || 'there',
            tier: plan as 'pro' | 'family',
            period: 'monthly', // TODO: detect from product ID
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
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
        // Subscription was updated (e.g., plan change)
        const customerId = eventData.customerId as string;
        const productId = eventData.productId as string;
        const currentPeriodStart = eventData.currentPeriodStart as string | undefined;
        const currentPeriodEnd = eventData.currentPeriodEnd as string | undefined;

        const plan = getPlanFromProductId(productId);

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            tier: plan,
            subscription_started_at: currentPeriodStart,
            subscription_ends_at: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('polar_customer_id', customerId);

        if (error) {
          logger.error('Failed to update subscription', error, {
            component: 'PolarWebhook',
            customerId,
          });
        }

        logger.info('Subscription updated', {
          component: 'PolarWebhook',
          customerId,
          plan,
        });
        break;
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        // Subscription was canceled or revoked
        const customerId = eventData.customerId as string;

        // Get current subscription for email
        const { data: currentSub } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, tier, subscription_ends_at')
          .eq('polar_customer_id', customerId)
          .single();

        // Update to free tier
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
          logger.error('Failed to cancel subscription', error, {
            component: 'PolarWebhook',
            customerId,
          });
          break;
        }

        // Get user info for email
        if (currentSub?.user_id) {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', currentSub.user_id)
            .single();

          if (userData?.email && currentSub.tier !== 'free') {
            // Send cancellation email (non-blocking)
            sendSubscriptionCancelledEmail({
              recipientEmail: userData.email,
              recipientName: userData.full_name || 'there',
              tier: currentSub.tier as 'pro' | 'family',
              accessUntil: currentSub.subscription_ends_at || new Date().toISOString(),
              resubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
            }).catch(err => {
              logger.error('Failed to send cancellation email', err, {
                component: 'PolarWebhook',
              });
            });
          }
        }

        logger.info('Subscription canceled', {
          component: 'PolarWebhook',
          customerId,
          eventType: event.type,
        });
        break;
      }

      case 'order.refunded': {
        // Handle refund - similar to subscription.revoked
        const customerId = eventData.customerId as string;
        const subscriptionId = eventData.subscriptionId as string | undefined;

        // If this is a subscription refund, cancel the subscription
        if (subscriptionId) {
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
