/**
 * Subscription Service
 * Handles all subscription-related business logic
 *
 * IMPORTANT: Server-side only - contains sensitive operations
 * OPTIMIZATION: Redis caching for subscription lookups (5-minute TTL)
 */

import { createClient } from '../supabase/server';
import type { SubscriptionTier, SubscriptionStatus, Subscription, TrialStatus } from '../types';
import { logger } from '@/lib/logger';
import { cacheAside, cacheKeys, CACHE_TTL, deleteCache } from '@/lib/cache';
import * as Sentry from '@sentry/nextjs';

// Trial configuration
export const TRIAL_DURATION_DAYS = 14;

/**
 * Get user's current subscription
 * OPTIMIZATION: Cached in Redis for 5 minutes to reduce DB lookups
 *
 * @param userId - The user ID to fetch subscription for
 * @param supabaseClient - Optional pre-authenticated Supabase client (avoids JWT refresh race conditions)
 */
export async function getUserSubscription(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<Subscription | null> {
  // Disable caching in test environment to prevent stale data
  const isTest = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';
  const cacheKey = cacheKeys.subscription(userId);

  const startTime = Date.now();
  let cacheHit = false;

  const result = await cacheAside<Subscription | null>(
    cacheKey,
    async () => {
      // Cache miss - track in Sentry
      cacheHit = false;

      const dbQueryStart = Date.now();

      // Use provided client (from API route) or create new one
      // Using the API route's client eliminates JWT refresh race conditions under concurrent load
      const supabase = supabaseClient || await createClient();

      const { data, error} = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      const dbQueryDuration = Date.now() - dbQueryStart;

      // Track database query performance in Sentry
      if (!isTest) {
        Sentry.addBreadcrumb({
          category: 'database',
          message: 'Subscription database query',
          level: error ? 'error' : 'info',
          data: {
            duration_ms: dbQueryDuration,
            success: !error,
            tier: data?.tier || 'unknown',
            using_provided_client: !!supabaseClient,
          },
        });

        if (!error) {
          Sentry.setMeasurement('subscription_db_query_duration', dbQueryDuration, 'millisecond');
        }
      }

      if (error) {
        logger.error('Error fetching subscription:', error, {
          component: 'lib-subscription-service',
          action: 'service_call',
          userId,
          usingProvidedClient: !!supabaseClient,
          duration_ms: dbQueryDuration,
        });

        // Capture error in Sentry
        if (!isTest) {
          Sentry.captureException(error, {
            tags: {
              component: 'subscription-service',
              operation: 'get-user-subscription',
            },
            contexts: {
              subscription: {
                user_id: userId,
                using_provided_client: !!supabaseClient,
                duration_ms: dbQueryDuration,
              },
            },
          });
        }

        return null;
      }

      return data;
    },
    isTest ? 0 : CACHE_TTL.MEDIUM, // No cache in tests, 5 minutes in prod
    () => { cacheHit = true; } // Callback when cache hit occurs
  );

  const totalDuration = Date.now() - startTime;

  // Track cache hit rate and total duration in Sentry
  if (!isTest) {
    Sentry.addBreadcrumb({
      category: 'cache',
      message: cacheHit ? 'Subscription cache hit' : 'Subscription cache miss',
      level: 'info',
      data: {
        cache_hit: cacheHit,
        total_duration_ms: totalDuration,
        tier: result?.tier || 'null',
      },
    });

    Sentry.setMeasurement('subscription_service_duration', totalDuration, 'millisecond');
    Sentry.setContext('subscription_cache', {
      cache_hit: cacheHit,
      duration_ms: totalDuration,
      tier: result?.tier || 'null',
    });
  }

  return result;
}

/**
 * Get user's subscription tier (considers trial)
 * Priority: Paid tier > Trial (pro) > Free
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(userId);

  // If no subscription or not active, return free tier
  if (!subscription || subscription.status !== 'active') {
    return 'free';
  }

  // If user has paid tier, return it
  if (subscription.tier === 'pro' || subscription.tier === 'family') {
    return subscription.tier;
  }

  // Check if user is in active trial (trial users get Pro access)
  if (subscription.trial_ends_at) {
    const trialEndsAt = new Date(subscription.trial_ends_at);
    if (trialEndsAt > new Date()) {
      return 'pro'; // Trial users get Pro access
    }
  }

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
  trial: TrialStatus;
}> {
  const subscription = await getUserSubscription(userId, supabaseClient);
  const expirationDate = await getSubscriptionExpirationDate(userId);
  const trialStatus = await getTrialStatus(userId, supabaseClient);

  let daysUntilExpiration: number | null = null;
  if (expirationDate) {
    const now = new Date();
    daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const result = {
    tier: subscription?.tier || 'free',
    status: subscription?.status || 'active',
    isActive: subscription?.status === 'active',
    isPastDue: subscription?.status === 'past_due',
    isCanceled: subscription?.status === 'canceled',
    expiresAt: expirationDate,
    daysUntilExpiration,
    trial: trialStatus,
  };

  return result;
}

// ============================================================================
// TRIAL FUNCTIONS
// ============================================================================

/**
 * Get user's trial status
 *
 * @param userId - The user ID to fetch trial status for
 * @param supabaseClient - Optional pre-authenticated Supabase client (avoids JWT refresh race conditions)
 */
export async function getTrialStatus(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<TrialStatus> {
  const subscription = await getUserSubscription(userId, supabaseClient);

  // If no subscription or has paid tier, not in trial
  if (!subscription || subscription.tier !== 'free') {
    return {
      isInTrial: false,
      daysRemaining: 0,
      trialEndsAt: null,
      trialStartedAt: null,
    };
  }

  const trialEndsAt = subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;
  const trialStartedAt = subscription.trial_started_at
    ? new Date(subscription.trial_started_at)
    : null;

  // Check if trial is still active
  const now = new Date();
  const isInTrial = trialEndsAt !== null && trialEndsAt > now;

  // Calculate days remaining
  let daysRemaining = 0;
  if (isInTrial && trialEndsAt) {
    daysRemaining = Math.ceil(
      (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    isInTrial,
    daysRemaining,
    trialEndsAt,
    trialStartedAt,
  };
}

/**
 * Check if user is currently in an active trial
 */
export async function isUserInTrial(userId: string): Promise<boolean> {
  const status = await getTrialStatus(userId);
  return status.isInTrial;
}

/**
 * Get the effective tier for a user (considers trial)
 * Trial users get Pro-level access
 */
export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(userId);

  // No subscription = free
  if (!subscription || subscription.status !== 'active') {
    return 'free';
  }

  // If user has a paid tier, return it
  if (subscription.tier === 'pro' || subscription.tier === 'family') {
    return subscription.tier;
  }

  // Check if user is in active trial
  const trialStatus = await getTrialStatus(userId);
  if (trialStatus.isInTrial) {
    return 'pro'; // Trial users get Pro access
  }

  // Default to free
  return 'free';
}

/**
 * Check if trial is expiring soon (for showing warnings)
 */
export async function isTrialExpiringSoon(
  userId: string,
  daysThreshold: number = 3
): Promise<boolean> {
  const trialStatus = await getTrialStatus(userId);
  return trialStatus.isInTrial && trialStatus.daysRemaining <= daysThreshold;
}

/**
 * Check if user's trial has expired (was on trial but now isn't)
 */
export async function hasTrialExpired(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  // No subscription or has paid tier
  if (!subscription || subscription.tier !== 'free') {
    return false;
  }

  // Had a trial that has now ended
  if (subscription.trial_ends_at) {
    const trialEndsAt = new Date(subscription.trial_ends_at);
    return trialEndsAt <= new Date();
  }

  return false;
}
