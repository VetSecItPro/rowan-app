/**
 * Subscription Service
 * Handles all subscription-related business logic
 *
 * IMPORTANT: Server-side only - contains sensitive operations
 */

import { createClient } from '../supabase/server';
import type { SubscriptionTier, SubscriptionStatus, Subscription, TrialStatus } from '../types';

// Trial configuration
export const TRIAL_DURATION_DAYS = 14;

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get user's subscription tier (considers trial - trial users get Pro access)
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
 */
export async function upsertSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel subscription (mark as canceled, keep active until period end)
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message };
  }

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
 */
export async function reactivateSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error reactivating subscription:', error);
    return { success: false, error: error.message };
  }

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
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
  trial: TrialStatus;
}> {
  const subscription = await getUserSubscription(userId);
  const expirationDate = await getSubscriptionExpirationDate(userId);
  const trialStatus = await getTrialStatus(userId);

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
    trial: trialStatus,
  };
}

// ============================================================================
// TRIAL FUNCTIONS
// ============================================================================

/**
 * Get user's trial status
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const subscription = await getUserSubscription(userId);

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
