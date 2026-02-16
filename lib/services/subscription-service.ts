/**
 * Subscription Service
 * Handles all subscription-related business logic
 *
 * IMPORTANT: Server-side only - contains sensitive operations
 * OPTIMIZATION: Redis caching for subscription lookups (2-minute TTL)
 *
 * BULLETPROOF TIER ENFORCEMENT:
 * - DB errors throw (never silently degrade to 'free')
 * - Only successful query results are cached
 * - Retry with fresh client on first failure
 * - Detailed logging at every decision point
 */

import { createClient } from '../supabase/server';
import type { SubscriptionTier, SubscriptionStatus, Subscription } from '../types';
import { logger } from '@/lib/logger';
import { getCache, setCache, cacheKeys, CACHE_TTL, deleteCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';

const SUBSCRIPTION_COLUMNS = 'id, user_id, tier, status, period, polar_customer_id, polar_subscription_id, is_founding_member, founding_member_number, founding_member_locked_price_id, subscription_started_at, subscription_ends_at, created_at, updated_at';

/**
 * Fetch subscription directly from DB (no cache).
 * Throws on DB error — never silently returns null for errors.
 */
async function fetchSubscriptionFromDB(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<Subscription | null> {
  const supabase = supabaseClient || await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // THROW on DB error — do NOT silently return null.
    // This prevents paying users from being treated as 'free'.
    throw new Error(`Subscription query failed for user ${userId}: ${error.message} (code: ${error.code})`);
  }

  return data;
}

/**
 * Get user's current subscription
 *
 * BULLETPROOF STRATEGY:
 * 1. Check Redis cache first
 * 2. On cache miss, query DB with the provided authenticated client
 * 3. If DB query fails, retry once with a fresh server client
 * 4. Only cache SUCCESSFUL results (never cache errors)
 * 5. If all attempts fail, THROW — let the API route return 500 instead of 403
 *
 * @param userId - The user ID to fetch subscription for
 * @param supabaseClient - Optional pre-authenticated Supabase client
 */
export async function getUserSubscription(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<Subscription | null> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';
  const cacheKey = cacheKeys.subscription(userId);
  const startTime = Date.now();

  // 1. Try cache first (skip in test)
  if (!isTest) {
    try {
      const cached = await getCache<Subscription>(cacheKey);
      if (cached !== null) {
        logger.info('[Subscription] Cache hit', {
          component: 'lib-subscription-service',
          action: 'cache_hit',
          userId,
          tier: cached.tier,
        });

        if (!isTest) {
          Sentry.addBreadcrumb({
            category: 'cache',
            message: 'Subscription cache hit',
            level: 'info',
            data: { tier: cached.tier, duration_ms: Date.now() - startTime },
          });
        }

        return cached;
      }
    } catch {
      // Cache read failed — continue to DB
    }
  }

  // 2. Query DB — with retry on failure
  let data: Subscription | null = null;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    const dbQueryStart = Date.now();

    try {
      // First attempt: use provided client. Second attempt: fresh client.
      const clientToUse = attempt === 1 ? supabaseClient : undefined;
      data = await fetchSubscriptionFromDB(userId, clientToUse);

      const dbQueryDuration = Date.now() - dbQueryStart;

      logger.info('[Subscription] DB query success', {
        component: 'lib-subscription-service',
        action: 'db_query_success',
        userId,
        attempt,
        tier: data?.tier || 'no-subscription',
        status: data?.status || 'no-subscription',
        duration_ms: dbQueryDuration,
        usedProvidedClient: attempt === 1 && !!supabaseClient,
      });

      if (!isTest) {
        Sentry.addBreadcrumb({
          category: 'database',
          message: `Subscription DB query success (attempt ${attempt})`,
          level: 'info',
          data: {
            duration_ms: dbQueryDuration,
            tier: data?.tier || 'no-subscription',
            using_provided_client: attempt === 1 && !!supabaseClient,
          },
        });
        Sentry.setMeasurement('subscription_db_query_duration', dbQueryDuration, 'millisecond');
      }

      break; // Success — exit retry loop

    } catch (error) {
      const dbQueryDuration = Date.now() - dbQueryStart;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[Subscription] DB query failed (attempt ${attempt}/${maxAttempts})`, error, {
        component: 'lib-subscription-service',
        action: 'db_query_error',
        userId,
        attempt,
        maxAttempts,
        duration_ms: dbQueryDuration,
        usedProvidedClient: attempt === 1 && !!supabaseClient,
      });

      if (!isTest) {
        Sentry.captureException(error, {
          tags: {
            component: 'subscription-service',
            operation: 'get-user-subscription',
            attempt: String(attempt),
          },
          contexts: {
            subscription: {
              user_id: userId,
              using_provided_client: attempt === 1 && !!supabaseClient,
              duration_ms: dbQueryDuration,
            },
          },
        });
      }

      // If this was the last attempt, THROW — do NOT degrade to 'free'
      if (attempt >= maxAttempts) {
        throw new Error(
          `[CRITICAL] Failed to fetch subscription after ${maxAttempts} attempts for user ${userId}. ` +
          `Last error: ${errorMessage}. ` +
          `This user may be a paying customer — returning 500 instead of incorrectly blocking access.`
        );
      }

      // Otherwise, retry with fresh client
      logger.warn('[Subscription] Retrying with fresh Supabase client...', {
        component: 'lib-subscription-service',
        action: 'retry',
        userId,
      });
    }
  }

  // 3. Cache successful result (only non-null subscriptions)
  if (data && !isTest) {
    setCache(cacheKey, data, CACHE_TTL.SHORT).catch(() => {
      // Cache write failed — not critical
    });
  }

  const totalDuration = Date.now() - startTime;

  if (!isTest) {
    Sentry.setMeasurement('subscription_service_duration', totalDuration, 'millisecond');
    Sentry.setContext('subscription_result', {
      cache_hit: false,
      duration_ms: totalDuration,
      tier: data?.tier || 'no-subscription',
      status: data?.status || 'no-subscription',
      attempts: attempt,
    });
  }

  return data;
}

/**
 * Get user's subscription tier
 *
 * BULLETPROOF: If getUserSubscription throws (DB error), this propagates the error
 * up to the API route, which returns 500 — NOT 403. A paying customer should never
 * be told to "upgrade" because of a transient infrastructure error.
 *
 * @param userId - The user ID to fetch tier for
 * @param supabaseClient - Optional pre-authenticated Supabase client
 */
export async function getUserTier(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<SubscriptionTier> {
  // getUserSubscription THROWS on DB error (never silently returns null for errors)
  // If it returns null, it genuinely means no subscription row exists → free tier
  const subscription = await getUserSubscription(userId, supabaseClient);

  if (!subscription) {
    logger.info('[Subscription] No subscription found — user is on free tier', {
      component: 'lib-subscription-service',
      action: 'tier_resolution',
      userId,
      resolvedTier: 'free',
    });
    return 'free';
  }

  if (subscription.status !== 'active') {
    logger.info('[Subscription] Subscription is not active', {
      component: 'lib-subscription-service',
      action: 'tier_resolution',
      userId,
      tier: subscription.tier,
      status: subscription.status,
      resolvedTier: 'free',
    });
    return 'free';
  }

  logger.info('[Subscription] Tier resolved successfully', {
    component: 'lib-subscription-service',
    action: 'tier_resolution',
    userId,
    resolvedTier: subscription.tier,
    status: subscription.status,
  });

  return subscription.tier;
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.status === 'active';
}

/**
 * Check if user has a specific tier or higher
 */
export async function hasTierAccess(
  userId: string,
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const userTier = await getUserTier(userId);

  // Tier hierarchy: free < pro < family
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    family: 2,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

/**
 * Check if subscription is past due
 */
export async function isSubscriptionPastDue(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.status === 'past_due';
}

/**
 * Check if subscription is canceled but still active until period end
 */
export async function isSubscriptionCanceled(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.status === 'canceled';
}

/**
 * Get subscription expiration date
 */
export async function getSubscriptionExpirationDate(userId: string): Promise<Date | null> {
  const subscription = await getUserSubscription(userId);

  if (!subscription?.subscription_ends_at) {
    return null;
  }

  return new Date(subscription.subscription_ends_at);
}

/**
 * Check if subscription is expiring soon (within X days)
 */
export async function isSubscriptionExpiringSoon(
  userId: string,
  daysThreshold: number = 7
): Promise<boolean> {
  const expirationDate = await getSubscriptionExpirationDate(userId);

  if (!expirationDate) {
    return false;
  }

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0;
}

/**
 * Create or update subscription
 * Invalidates subscription cache on success
 */
export async function upsertSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Error upserting subscription:', error, { component: 'lib-subscription-service', action: 'service_call' });
    return { success: false, error: error.message };
  }

  // Invalidate subscription cache
  deleteCache(cacheKeys.subscription(userId)).catch(() => {});

  return { success: true };
}

/**
 * Cancel subscription (mark as canceled, keep active until period end)
 * Invalidates subscription cache on success
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error canceling subscription:', error, { component: 'lib-subscription-service', action: 'service_call' });
    return { success: false, error: error.message };
  }

  // Invalidate subscription cache
  deleteCache(cacheKeys.subscription(userId)).catch(() => {});

  // Log the cancellation event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_cancelled',
    trigger_source: 'user_action',
  });

  return { success: true };
}

/**
 * Reactivate a canceled subscription
 * Invalidates subscription cache on success
 */
export async function reactivateSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Error reactivating subscription:', error, { component: 'lib-subscription-service', action: 'service_call' });
    return { success: false, error: error.message };
  }

  // Invalidate subscription cache
  deleteCache(cacheKeys.subscription(userId)).catch(() => {});

  // Log the reactivation event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_updated',
    trigger_source: 'user_action',
  });

  return { success: true };
}

/**
 * Get subscription status with detailed info
 *
 * @param userId - The user ID to fetch subscription status for
 * @param supabaseClient - Optional pre-authenticated Supabase client (avoids JWT refresh race conditions)
 */
export async function getSubscriptionStatus(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<{
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
}> {
  const subscription = await getUserSubscription(userId, supabaseClient);
  const expirationDate = await getSubscriptionExpirationDate(userId);

  let daysUntilExpiration: number | null = null;
  if (expirationDate) {
    const now = new Date();
    daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    tier: subscription?.tier || 'free',
    status: subscription?.status || 'active',
    isActive: subscription?.status === 'active',
    isPastDue: subscription?.status === 'past_due',
    isCanceled: subscription?.status === 'canceled',
    expiresAt: expirationDate,
    daysUntilExpiration,
  };
}
